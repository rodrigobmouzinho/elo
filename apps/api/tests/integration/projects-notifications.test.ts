import { beforeEach, describe, expect, it, vi } from "vitest";

const CURRENT_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const OWNER_MEMBER_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";
const THIRD_MEMBER_ID = "e8cb1a1d-6fd3-4c0c-8ad1-a462749cf2ef";

function buildProject(ownerMemberId: string) {
  return {
    id: "project-notifications-1",
    title: "Hub de operacao para clubes de negocio",
    summary: "Produto para coordenar comunidade, eventos e trilhas comerciais.",
    category: "SaaS",
    businessAreas: ["SaaS", "Comunidade"],
    vision:
      "Unificar operacao de comunidade, agenda, relacionamento e inteligencia comercial em um fluxo de uso simples para times pequenos.",
    needs: [
      {
        title: "Produto",
        description: "Perfil para organizar discovery, backlog e cadencia de iteracao."
      }
    ],
    galleryImageUrls: [],
    description:
      "Produto para coordenar comunidade, eventos e trilhas comerciais.\n\nUnificar operacao de comunidade, agenda, relacionamento e inteligencia comercial em um fluxo de uso simples para times pequenos.",
    lookingFor: "Produto",
    ownerName: ownerMemberId === CURRENT_MEMBER_ID ? "Ana Costa" : "Pedro Nunes",
    ownerMemberId,
    status: "active" as const,
    completedAt: null,
    inactivatedAt: null,
    updatedAt: "2026-03-22T12:00:00.000Z"
  };
}

describe("projects notifications", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("creates in-app notifications when project applications are approved or rejected", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: approveRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/approve/route"
    );
    const { POST: rejectRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/reject/route"
    );

    memoryStore.projectIdeas = [buildProject(CURRENT_MEMBER_ID)];
    memoryStore.projectApplications = [
      {
        id: "application-approved-notification",
        projectId: "project-notifications-1",
        ownerMemberId: CURRENT_MEMBER_ID,
        applicantMemberId: OWNER_MEMBER_ID,
        message: "Posso liderar discovery e produto.",
        status: "applied",
        createdAt: "2026-03-22T12:05:00.000Z"
      },
      {
        id: "application-rejected-notification",
        projectId: "project-notifications-1",
        ownerMemberId: CURRENT_MEMBER_ID,
        applicantMemberId: THIRD_MEMBER_ID,
        message: "Tenho experiencia em vendas.",
        status: "applied",
        createdAt: "2026-03-22T12:06:00.000Z"
      }
    ];
    memoryStore.memberNotifications = [];
    memoryStore.auditLogs = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    await approveRoute(
      new Request(
        "http://localhost/api/app/projects/project-notifications-1/applications/application-approved-notification/approve",
        {
          method: "POST",
          headers
        }
      ),
      {
        params: Promise.resolve({
          id: "project-notifications-1",
          applicationId: "application-approved-notification"
        })
      }
    );

    await rejectRoute(
      new Request(
        "http://localhost/api/app/projects/project-notifications-1/applications/application-rejected-notification/reject",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "Estamos priorizando um perfil mais ligado a produto nesta fase."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "project-notifications-1",
          applicationId: "application-rejected-notification"
        })
      }
    );

    expect(memoryStore.memberNotifications).toHaveLength(2);
    expect(memoryStore.memberNotifications[0]).toMatchObject({
      memberId: THIRD_MEMBER_ID,
      type: "project_application_rejected"
    });
    expect(memoryStore.memberNotifications[0]?.body).toContain("Motivo");
    expect(memoryStore.memberNotifications[1]).toMatchObject({
      memberId: OWNER_MEMBER_ID,
      type: "project_application_accepted"
    });
    expect(memoryStore.auditLogs.map((item) => item.action)).toContain("member.notification_created");
  });

  it("lists only the current member notifications with unread count and marks them as read", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: listNotificationsRoute } = await import("../../app/api/app/notifications/route");
    const { POST: markReadRoute } = await import(
      "../../app/api/app/notifications/[id]/read/route"
    );

    memoryStore.memberNotifications = [
      {
        id: "notification-current-unread",
        memberId: CURRENT_MEMBER_ID,
        type: "project_application_rejected",
        title: "Atualizacao sobre Projeto Alpha",
        body: "Sua candidatura nao foi aprovada. Motivo: vaga preenchida.",
        metadata: {
          projectId: "project-alpha"
        },
        readAt: null,
        createdAt: "2026-03-22T12:20:00.000Z"
      },
      {
        id: "notification-current-read",
        memberId: CURRENT_MEMBER_ID,
        type: "project_application_accepted",
        title: "Voce entrou em Projeto Beta",
        body: "Sua candidatura foi aprovada.",
        metadata: {
          projectId: "project-beta"
        },
        readAt: "2026-03-22T12:15:00.000Z",
        createdAt: "2026-03-22T12:10:00.000Z"
      },
      {
        id: "notification-other-member",
        memberId: OWNER_MEMBER_ID,
        type: "project_application_accepted",
        title: "Outra notificacao",
        body: "Nao deve aparecer para o viewer atual.",
        metadata: null,
        readAt: null,
        createdAt: "2026-03-22T12:25:00.000Z"
      }
    ];

    const listResponse = await listNotificationsRoute(
      new Request("http://localhost/api/app/notifications", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.data.items).toHaveLength(2);
    expect(listPayload.data.unreadCount).toBe(1);
    expect(listPayload.data.items[0].id).toBe("notification-current-unread");

    const readResponse = await markReadRoute(
      new Request("http://localhost/api/app/notifications/notification-current-unread/read", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      }),
      {
        params: Promise.resolve({ id: "notification-current-unread" })
      }
    );
    const readPayload = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(readPayload.data.readAt).toBeTruthy();
    expect(memoryStore.memberNotifications[0]?.readAt).toBeTruthy();
  });
});
