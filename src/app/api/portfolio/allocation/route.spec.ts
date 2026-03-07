import { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/proxy", () => ({ fetchBackend: jest.fn() }));
jest.mock("@/lib/decodeJwt", () => ({ getUserIdFromCookieHeader: jest.fn() }));

import { fetchBackend } from "@/lib/proxy";
import { getUserIdFromCookieHeader } from "@/lib/decodeJwt";
const mockFetchBackend = fetchBackend as jest.Mock;
const mockGetUserId = getUserIdFromCookieHeader as jest.Mock;

const MOCK_COOKIE = "access_token=header.eyJzdWIiOiJ1c2VyLTEyMyJ9.sig";

function makeRequest(cookie = MOCK_COOKIE) {
  return new NextRequest("http://localhost/api/portfolio/allocation", {
    headers: { cookie },
  });
}

describe("GET /api/portfolio/allocation", () => {
  beforeEach(() => {
    mockGetUserId.mockReturnValue("user-123");
    mockFetchBackend.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { bySector: [], bySymbol: [] },
      }),
    });
  });

  it("extracts userId from JWT cookie", async () => {
    await GET(makeRequest());

    expect(mockFetchBackend).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/user-123/allocation"),
      expect.anything(),
      MOCK_COOKIE
    );
  });

  it("returns 401 when JWT cookie is missing", async () => {
    mockGetUserId.mockReturnValue(null);

    const res = await GET(makeRequest(""));
    expect(res.status).toBe(401);
  });

  it("returns allocation data on success", async () => {
    mockFetchBackend.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          bySector: [{ name: "Banking", value: 5000, percentage: 50 }],
          bySymbol: [{ name: "COMI", value: 5000, percentage: 50 }],
        },
      }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.bySector[0].name).toBe("Banking");
  });

  it("returns empty allocation when backend returns non-ok", async () => {
    mockFetchBackend.mockResolvedValue({ ok: false, json: async () => ({}) });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.data).toEqual({ bySector: [], bySymbol: [] });
  });
});
