import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { cacheApiResponse, getCachedApiResponse } from "@/lib/apiCache";
import { isOffline } from "@/lib/networkStatus";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock("@/lib/apiCache", () => ({
  SETTINGS_CACHE_KEY: "public-settings",
  cacheApiResponse: jest.fn(),
  getCachedApiResponse: jest.fn(),
}));

jest.mock("@/lib/networkStatus", () => ({
  isOffline: jest.fn(),
}));

jest.mock("@/lib/apiBase", () => ({
  getApiBaseUrl: () => "https://api.example.test",
}));

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
const mockedCacheRead = getCachedApiResponse as jest.MockedFunction<typeof getCachedApiResponse>;
const mockedCacheWrite = cacheApiResponse as jest.MockedFunction<typeof cacheApiResponse>;
const mockedIsOffline = isOffline as jest.MockedFunction<typeof isOffline>;

describe("usePublicSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedIsOffline.mockReturnValue(false);
    mockedCacheRead.mockResolvedValue({
      site_name: "Cached Site",
      logo_url: "/cached-logo.png",
    });
    mockedAxiosGet.mockResolvedValue({
      data: {
        data: {
          site_name: "Live Site",
          logo_url: "/live-logo.png",
        },
      },
    } as never);
    mockedCacheWrite.mockResolvedValue(undefined);
  });

  it("revalidates online and replaces stale cached CMS settings with live values", async () => {
    const { result } = renderHook(() => usePublicSettings(["site_name", "logo_url"]));

    await waitFor(() => {
      expect(result.current.settings).toEqual({
        site_name: "Live Site",
        logo_url: "/live-logo.png",
      });
    });

    expect(mockedAxiosGet).toHaveBeenCalledWith(
      "https://api.example.test/api/v1/settings",
      { timeout: 60000 },
    );
    expect(mockedCacheWrite).toHaveBeenCalledWith(
      "public-settings",
      {
        site_name: "Live Site",
        logo_url: "/live-logo.png",
      },
      7 * 24 * 60,
    );
  });
});
