import { NextRequest } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const params = await context.params;
    const symbol = params.symbol;

    if (!symbol) {
      return Response.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Decode the symbol in case it was URL encoded
    const decodedSymbol = decodeURIComponent(symbol).toUpperCase();

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/favorites/${encodeURIComponent(
        decodedSymbol
      )}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 404) {
        return Response.json({
          message: "Stock was not in favorites or already removed",
          success: true,
        });
      }

      return Response.json(
        {
          error:
            errorData.detail || `Failed to remove favorite: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return Response.json({
      ...result,
      message: "Favorite removed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Remove favorite API error:", error);

    // Handle timeout errors
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        { error: "Request timeout - please try again" },
        { status: 408 }
      );
    }

    return Response.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const params = await context.params;
    const symbol = params.symbol;

    if (!symbol) {
      return Response.json({ error: "Symbol is required" }, { status: 400 });
    }

    // Decode the symbol in case it was URL encoded
    const decodedSymbol = decodeURIComponent(symbol).toUpperCase();

    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/favorites/${encodeURIComponent(
        decodedSymbol
      )}/check`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle 404 as not a favorite
      if (response.status === 404) {
        return Response.json({
          isFavorite: false,
          exists: false,
          message: "Stock not found in favorites",
        });
      }

      console.error(`Backend error: ${response.status}`, errorData);

      return Response.json(
        {
          error:
            errorData.detail || `Failed to check favorite: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    return Response.json({
      isFavorite: result.exists || false,
      exists: result.exists || false,
      ...result,
    });
  } catch (error) {
    console.error("Check favorite API error:", error);

    // Handle timeout errors
    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        { error: "Request timeout - please try again" },
        { status: 408 }
      );
    }

    return Response.json(
      { error: "Failed to check favorite status" },
      { status: 500 }
    );
  }
}
