import QRCode from "qrcode";

export type PaymentsMode = "manual_pix";

export type ManualPaymentInstructions = {
  pixKey: string;
  keyType: string | null;
  beneficiaryName: string | null;
  proofContact: string | null;
  instructions: string;
  txId: string;
  pixCopyPaste: string;
  pixQrCodeImage: string;
  amountCents: number;
  externalReference: string;
};

export type ManualPaymentSnapshot = Omit<ManualPaymentInstructions, "pixQrCodeImage">;

type ManualPaymentRequestInput = {
  amountCents: number;
  gatewayPaymentId: string;
  externalReference: string;
  existingSnapshot?: Partial<ManualPaymentSnapshot> | null;
};

function toMoneyBRL(amountCents: number) {
  return `R$ ${(amountCents / 100).toFixed(2)}`;
}

function toEmvField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function normalizePixText(input: string | null | undefined, fallback: string, maxLength: number) {
  const normalized = String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const source = normalized || fallback;
  return source.slice(0, maxLength);
}

function computeCrc16Ccitt(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function deriveTxId(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (normalized.length >= 6) {
    return normalized.slice(0, 25);
  }

  const randomSuffix = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return `${normalized}${randomSuffix}`.slice(0, 25);
}

function buildPixCopyPastePayload(params: {
  pixKey: string;
  amountCents: number;
  txId: string;
  merchantName: string;
  merchantCity: string;
}) {
  const amount = (params.amountCents / 100).toFixed(2);

  const merchantAccountInfo = toEmvField(
    "26",
    `${toEmvField("00", "BR.GOV.BCB.PIX")}${toEmvField("01", params.pixKey)}`
  );

  const additionalDataField = toEmvField("62", toEmvField("05", params.txId));

  const payloadWithoutCrc = [
    toEmvField("00", "01"),
    toEmvField("01", "12"),
    merchantAccountInfo,
    toEmvField("52", "0000"),
    toEmvField("53", "986"),
    toEmvField("54", amount),
    toEmvField("58", "BR"),
    toEmvField("59", params.merchantName),
    toEmvField("60", params.merchantCity),
    additionalDataField,
    "6304"
  ].join("");

  const crc = computeCrc16Ccitt(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

function resolveBaseInstructions(params: {
  amountCents: number;
  proofContact: string | null;
  existingInstructions?: string;
}) {
  if (params.existingInstructions?.trim()) {
    return params.existingInstructions.trim();
  }

  const customInstructions = process.env.MANUAL_PIX_INSTRUCTIONS?.trim();

  if (customInstructions) {
    return customInstructions;
  }

  return [
    `Realize o PIX no valor de ${toMoneyBRL(params.amountCents)} usando o QR Code ou o código copia e cola.`,
    params.proofContact
      ? `Depois envie o comprovante para ${params.proofContact} para liberação da presença.`
      : "Depois envie o comprovante para o time financeiro para liberação da presença."
  ].join(" ");
}

function resolvePixKey(existingSnapshot?: Partial<ManualPaymentSnapshot> | null) {
  const pixKey = existingSnapshot?.pixKey?.trim() || process.env.MANUAL_PIX_KEY?.trim();

  if (!pixKey) {
    throw new Error("MANUAL_PIX_KEY não configurada para o modo manual_pix");
  }

  return pixKey;
}

export function getPaymentsMode(): PaymentsMode {
  return "manual_pix";
}

export function readManualPaymentSnapshot(gatewayPayload: unknown): Partial<ManualPaymentSnapshot> | null {
  if (!gatewayPayload || typeof gatewayPayload !== "object" || Array.isArray(gatewayPayload)) {
    return null;
  }

  const payload = gatewayPayload as Record<string, unknown>;
  const candidate =
    payload.paymentRequest && typeof payload.paymentRequest === "object" && !Array.isArray(payload.paymentRequest)
      ? (payload.paymentRequest as Record<string, unknown>)
      : payload;

  const txId = typeof candidate.txId === "string" ? candidate.txId : undefined;
  const pixCopyPaste = typeof candidate.pixCopyPaste === "string" ? candidate.pixCopyPaste : undefined;
  const pixKey = typeof candidate.pixKey === "string" ? candidate.pixKey : undefined;
  const keyType = typeof candidate.keyType === "string" ? candidate.keyType : null;
  const beneficiaryName =
    typeof candidate.beneficiaryName === "string" ? candidate.beneficiaryName : null;
  const proofContact = typeof candidate.proofContact === "string" ? candidate.proofContact : null;
  const instructions = typeof candidate.instructions === "string" ? candidate.instructions : undefined;
  const amountCents = typeof candidate.amountCents === "number" ? candidate.amountCents : undefined;
  const externalReference =
    typeof candidate.externalReference === "string" ? candidate.externalReference : undefined;

  if (!txId && !pixCopyPaste && !pixKey) {
    return null;
  }

  return {
    txId,
    pixCopyPaste,
    pixKey,
    keyType,
    beneficiaryName,
    proofContact,
    instructions,
    amountCents,
    externalReference
  };
}

export async function buildManualPaymentRequest(
  input: ManualPaymentRequestInput
): Promise<{ manualPayment: ManualPaymentInstructions; snapshot: ManualPaymentSnapshot }> {
  const snapshot = input.existingSnapshot ?? null;
  const amountCents = snapshot?.amountCents ?? input.amountCents;
  const externalReference = snapshot?.externalReference ?? input.externalReference;
  const pixKey = resolvePixKey(snapshot);
  const keyType = snapshot?.keyType ?? process.env.MANUAL_PIX_KEY_TYPE?.trim() ?? null;
  const beneficiaryName =
    snapshot?.beneficiaryName ?? process.env.MANUAL_PIX_BENEFICIARY?.trim() ?? null;
  const proofContact =
    snapshot?.proofContact ?? process.env.MANUAL_PAYMENT_PROOF_CONTACT?.trim() ?? null;
  const txId = snapshot?.txId?.trim() || deriveTxId(input.gatewayPaymentId);
  const merchantName = normalizePixText(
    beneficiaryName,
    "ELO NETWORKING",
    25
  );
  const merchantCity = normalizePixText(process.env.MANUAL_PIX_CITY, "FORTALEZA", 15);

  const pixCopyPaste =
    snapshot?.pixCopyPaste?.trim() ||
    buildPixCopyPastePayload({
      pixKey,
      amountCents,
      txId,
      merchantName,
      merchantCity
    });

  const instructions = resolveBaseInstructions({
    amountCents,
    proofContact,
    existingInstructions: snapshot?.instructions
  });

  const pixQrCodeImage = await QRCode.toDataURL(pixCopyPaste, {
    width: 280,
    margin: 1,
    errorCorrectionLevel: "M"
  });

  const manualPayment: ManualPaymentInstructions = {
    pixKey,
    keyType,
    beneficiaryName,
    proofContact,
    instructions,
    txId,
    pixCopyPaste,
    pixQrCodeImage,
    amountCents,
    externalReference
  };

  return {
    manualPayment,
    snapshot: {
      pixKey,
      keyType,
      beneficiaryName,
      proofContact,
      instructions,
      txId,
      pixCopyPaste,
      amountCents,
      externalReference
    }
  };
}
