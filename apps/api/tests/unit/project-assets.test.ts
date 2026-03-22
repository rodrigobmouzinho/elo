import { beforeEach, describe, expect, it, vi } from "vitest";

describe("project assets uploads", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("ensures the project asset bucket before uploading files", async () => {
    const createBucket = vi.fn().mockResolvedValue({
      data: { name: "project-assets" },
      error: null
    });
    const upload = vi.fn().mockResolvedValue({ data: { path: "projects/member-1/documentation/pitch.pdf" }, error: null });
    const getPublicUrl = vi.fn().mockReturnValue({
      data: {
        publicUrl: "https://example.com/storage/v1/object/public/project-assets/pitch.pdf"
      }
    });

    vi.doMock("../../lib/supabase", () => ({
      hasSupabase: true,
      supabaseAdmin: {
        storage: {
          createBucket,
          from: vi.fn(() => ({
            upload,
            getPublicUrl
          }))
        }
      }
    }));

    const { uploadProjectFiles } = await import("../../lib/project-assets");

    const uploads = await uploadProjectFiles({
      kind: "documentation",
      files: [
        new File(["%PDF-1.4"], "pitch.pdf", {
          type: "application/pdf"
        })
      ],
      memberId: "member-1"
    });

    expect(createBucket).toHaveBeenCalledWith("project-assets", {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(uploads[0]).toMatchObject({
      name: "pitch.pdf",
      url: "https://example.com/storage/v1/object/public/project-assets/pitch.pdf"
    });
  });
});
