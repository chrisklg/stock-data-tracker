const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords");

  if (!keywords) {
    return Response.json({ error: "Keywords are required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${PYTHON_BACKEND_URL}/api/search?keywords=${encodeURIComponent(
        keywords
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 seconds
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.detail || `Search failed: ${response.status}` },
        { status: response.status }
      );
    }

    const searchResults = await response.json();
    return Response.json(searchResults);
  } catch (error) {
    console.error("Search route error:", error);
    return Response.json(
      { error: "Failed to search symbols" },
      { status: 500 }
    );
  }
}
