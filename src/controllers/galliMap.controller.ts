import { Request, Response } from "express";

const GALLI_AUTOCOMPLETE_URL =
  "https://route-init.gallimap.com/api/v1/search/autocomplete";

const GALLI_SEARCH_URL =
  "https://route-init.gallimap.com/api/v1/search";

const DEFAULT_LAT = "27.7172";
const DEFAULT_LNG = "85.3240";

const getQueryString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }

  return "";
};

const getNumberValue = (value: unknown): number | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
};

const getAccessToken = (): string => {
  const accessToken = process.env.GALLI_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "Galli access token is missing in backend .env"
    );
  }

  return accessToken;
};

/**
 * Galli may wrap a place inside data, result, place, or feature.
 */
const getItemSource = (item: any): any => {
  return (
    item?.data ??
    item?.result ??
    item?.place ??
    item?.feature ??
    item
  );
};

/**
 * Galli can return coordinates in several different formats.
 */
const extractLatLng = (item: any) => {
  const source = getItemSource(item);

  const possibleLat =
    source?.lat ??
    source?.latitude ??
    source?.y ??
    source?.latLng?.lat ??
    source?.latlng?.lat ??
    source?.location?.lat ??
    source?.location?.latitude ??
    source?.location?.coordinates?.[1] ??
    source?.geometry?.location?.lat ??
    source?.geometry?.location?.latitude ??
    source?.geometry?.coordinates?.[1] ??
    source?.coordinates?.lat ??
    source?.coordinates?.latitude ??
    source?.coordinates?.[1] ??
    source?.coordinate?.lat ??
    source?.coordinate?.latitude ??
    source?.coordinate?.[1] ??
    source?.center?.[1] ??
    source?.point?.lat ??
    source?.point?.latitude;

  const possibleLng =
    source?.lng ??
    source?.lon ??
    source?.long ??
    source?.longitude ??
    source?.x ??
    source?.latLng?.lng ??
    source?.latLng?.lon ??
    source?.latlng?.lng ??
    source?.latlng?.lon ??
    source?.location?.lng ??
    source?.location?.lon ??
    source?.location?.long ??
    source?.location?.longitude ??
    source?.location?.coordinates?.[0] ??
    source?.geometry?.location?.lng ??
    source?.geometry?.location?.lon ??
    source?.geometry?.location?.longitude ??
    source?.geometry?.coordinates?.[0] ??
    source?.coordinates?.lng ??
    source?.coordinates?.lon ??
    source?.coordinates?.long ??
    source?.coordinates?.longitude ??
    source?.coordinates?.[0] ??
    source?.coordinate?.lng ??
    source?.coordinate?.lon ??
    source?.coordinate?.long ??
    source?.coordinate?.longitude ??
    source?.coordinate?.[0] ??
    source?.center?.[0] ??
    source?.point?.lng ??
    source?.point?.lon ??
    source?.point?.longitude;

  return {
    latitude: getNumberValue(possibleLat),
    longitude: getNumberValue(possibleLng),
  };
};

const getItemName = (item: any): string => {
  const source = getItemSource(item);

  return String(
    source?.name ??
      source?.title ??
      source?.label ??
      source?.address ??
      source?.formatted_address ??
      source?.formattedAddress ??
      source?.description ??
      source?.word ??
      source?.place_name ??
      "Selected location"
  );
};

const getItemFullAddress = (
  item: any,
  fallbackName: string
): string => {
  const source = getItemSource(item);

  return String(
    source?.fullAddress ??
      source?.formatted_address ??
      source?.formattedAddress ??
      source?.address ??
      source?.description ??
      source?.place_name ??
      source?.name ??
      source?.title ??
      source?.label ??
      source?.word ??
      fallbackName
  );
};

const normalizeGalliItem = (item: any) => {
  const source = getItemSource(item);
  const { latitude, longitude } = extractLatLng(item);

  const name = getItemName(item);
  const fullAddress = getItemFullAddress(item, name);

  return {
    id: String(
      source?.id ??
        source?._id ??
        source?.place_id ??
        source?.placeId ??
        source?.osm_id ??
        source?.key ??
        `${name}-${latitude}-${longitude}`
    ),
    name,
    fullAddress,
    latitude,
    longitude,
    raw: item,
  };
};

/**
 * Extract a result list from common Galli response structures.
 */
const getGalliList = (
  result: any,
  depth = 0
): any[] => {
  if (!result || depth > 4) {
    return [];
  }

  if (Array.isArray(result)) {
    return result;
  }

  if (typeof result !== "object") {
    return [];
  }

  const possibleKeys = [
    "data",
    "results",
    "features",
    "suggestions",
    "places",
    "result",
    "items",
  ];

  for (const key of possibleKeys) {
    const value = result?.[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const key of possibleKeys) {
    const value = result?.[key];

    if (value && typeof value === "object") {
      const nestedResult = getGalliList(
        value,
        depth + 1
      );

      if (nestedResult.length > 0) {
        return nestedResult;
      }
    }
  }

  return [result];
};

const buildAutocompleteUrl = ({
  word,
  lat,
  lng,
}: {
  word: string;
  lat: string;
  lng: string;
}): URL => {
  const url = new URL(GALLI_AUTOCOMPLETE_URL);

  url.searchParams.set(
    "accessToken",
    getAccessToken()
  );

  url.searchParams.set("word", word);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lng", lng);

  return url;
};

const buildSearchUrl = ({
  name,
}: {
  name: string;
}): URL => {
  const url = new URL(GALLI_SEARCH_URL);

  url.searchParams.set(
    "accessToken",
    getAccessToken()
  );

  /*
   * Galli search accepts "name".
   * Do not send latitude or longitude to this endpoint.
   */
  url.searchParams.set("name", name);

  return url;
};

const galliHeaders = {
  Accept: "application/json",
  Origin: "https://freshcart.com",
  Referer: "https://freshcart.com/",
};

export const galliAutocomplete = async (
  req: Request,
  res: Response
) => {
  try {
    const word = getQueryString(req.query.word);

    const lat =
      getQueryString(req.query.lat) || DEFAULT_LAT;

    const lng =
      getQueryString(req.query.lng) || DEFAULT_LNG;

    if (!word || word.length < 3) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const url = buildAutocompleteUrl({
      word,
      lat,
      lng,
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: galliHeaders,
    });

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          result?.message ||
          result?.error ||
          "Failed to fetch location suggestions from Galli Maps",
        details: result,
      });
    }

    const data = getGalliList(result)
      .map(normalizeGalliItem)
      .filter(
        (item) =>
          typeof item.name === "string" &&
          item.name.trim().length > 0
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "GALLI AUTOCOMPLETE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to search address",
    });
  }
};

export const galliSearch = async (
  req: Request,
  res: Response
) => {
  try {
    /*
     * Flutter sends:
     *
     * /api/v1/maps/galli/search?word=Kathmandu
     *
     * The backend converts word into Galli's name parameter.
     */
    const word = getQueryString(req.query.word);

    if (!word || word.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Search word is required",
      });
    }

    const url = buildSearchUrl({
      name: word,
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: galliHeaders,
    });

    const result = await response
      .json()
      .catch(() => null);

    /*
     * Temporary development log.
     * It logs only the response body, not the token URL.
     */
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "GALLI SEARCH RAW RESPONSE:",
        JSON.stringify(result, null, 2)
      );
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          result?.message ||
          result?.error ||
          "Failed to fetch selected location from Galli Maps",
        details: result,
      });
    }

    const data = getGalliList(result)
      .map(normalizeGalliItem)
      .filter(
        (item) =>
          typeof item.name === "string" &&
          item.name.trim().length > 0
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "GALLI SEARCH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to fetch selected location",
    });
  }
};