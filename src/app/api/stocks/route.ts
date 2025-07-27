const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const days = searchParams.get("days") || "100";

  if (!symbol) {
    return Response.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    // Call Python backend
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/stocks?symbol=${encodeURIComponent(
        symbol
      )}&days=${days}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout - 30 seconds
        signal: AbortSignal.timeout(30000), 
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Python backend error: ${response.status}`, errorData);

      return Response.json(
        {
          error: errorData.detail || `Backend error: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const stockData = await response.json();

    return Response.json(stockData);
  } catch (error) {
    console.error("Route error:", error);

    // Handle different types of errors
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
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
