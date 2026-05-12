export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { taskId } = req.query;
  if (!taskId) return res.status(400).json({ error: 'taskId required' });

  const KIE_KEY = process.env.KIE_KEY;
  if (!KIE_KEY) return res.status(500).json({ error: 'KIE_KEY not configured' });

  try {
    const resp = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${KIE_KEY}` },
    });

    const data = await resp.json();
    const state = data?.data?.state;

    if (state === 'success') {
      const result = JSON.parse(data.data.resultJson);
      const url = result.resultUrls?.[0];
      return res.status(200).json({ state: 'success', url });
    }

    if (state === 'failed') {
      return res.status(200).json({ state: 'failed' });
    }

    return res.status(200).json({ state: state || 'pending' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
