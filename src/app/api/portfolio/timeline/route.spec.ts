import { NextRequest } from "next/server";
import { GET } from "./route";

jest.mock("@/lib/proxy", () => ({ fetchBackend: jest.fn() }));
jest.mock("@/lib/decodeJwt", () => ({ getUserIdFromCookieHeader: jest.fn() }));

import { fetchBackend } from "@/lib/proxy";
import { getUserIdFromCookieHeader } from "@/lib/decodeJwt";
const mockFetchBackend = fetchBackend as jest.Mock;
const mockGetUserId = getUserIdFromCookieHeader as jest.Mock;

const MOCK_COOKIE = "access_token=header.eyJzdWIiOiJ1c2VyLTEyMyJ9.sig";

function makeRequest(search = "?from=2025-01-01&to=2025-01-31", cookie = MOCK_COOKIE) {
  return new NextRequest(`http://localhost/api/portfolio/timeline${search}`, {
    headers: { cookie },
  });
}

describe("GET /api/portfolio/timeline", () => {
  beforeEach(() => {
    mockGetUserId.mockReturnValue("user-123");
    mockFetchBackend.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
  });

  it("extracts userId from JWT cookie and calls backend with correct path", async () => {
    await GET(makeRequest());

    expect(mockFetchBackend).toHaveBeenCalledWith(
      expect.stringContaining("/portfolio/user-123/timeline"),
      expect.anything(),
      MOCK_COOKIE
    );
  });

  it("forwards from and to query params to backend", async () => {
    await GET(makeRequest("?from=2025-01-01&to=2025-01-31"));

    expect(mockFetchBackend).toHaveBeenCalledWith(
      expect.stringContaining("from=2025-01-01"),
      expect.anything(),
      expect.anything()
    );
    expect(mockFetchBackend).toHaveBeenCalledWith(
      expect.stringContaining("to=2025-01-31"),
      expect.anything(),
      expect.anything()
    );
  });

  it("returns 401 when JWT cookie is missing", async () => {
    mockGetUserId.mockReturnValue(null);

    const req = makeRequest("?from=2025-01-01&to=2025-01-31", "");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns backend response with correct status on success", async () => {
    mockFetchBackend.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [{ timestamp: "2025-01-01", totalValue: 1000 }] }),
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns empty data array when backend responds with non-ok", async () => {
    mockFetchBackend.mockResolvedValue({ ok: false, json: async () => ({}) });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.data).toEqual([]);
  });
});
