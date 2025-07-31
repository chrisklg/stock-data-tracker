const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/favorites`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Backend error: ${response.status}`, errorData);

      return Response.json(
        {
          error:
            errorData.detail || `Failed to fetch favorites: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const favorites = await response.json();
    return Response.json(favorites);
  } catch (error) {
    console.error("Favorites API error:", error);

    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return Response.json(
          { error: "Request timeout - please try again" },
          { status: 408 }
        );
      }

      if (error.message.includes("fetch")) {
        return Response.json(
          { error: "Unable to connect to backend service" },
          { status: 503 }
        );
      }
    }

    return Response.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.symbol) {
      return Response.json({ error: "Symbol is required" }, { status: 400 });
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: body.symbol,
        name: body.name,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Backend error: ${response.status}`, errorData);

      return Response.json(
        {
          error:
            errorData.detail || `Failed to add favorite: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const favorite = await response.json();
    return Response.json(favorite);
  } catch (error) {
    console.error("Add favorite API error:", error);
    return Response.json({ error: "Failed to add favorite" }, { status: 500 });
  }
}
