export async function GET() {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    const data = await res.json()

    const filtered = data
      .filter((e: any) => e.country === "US")
      .slice(0, 20)

    return Response.json(filtered)
  } catch (err) {
    return Response.json({ error: "Failed to fetch" }, { status: 500 })
  }
}