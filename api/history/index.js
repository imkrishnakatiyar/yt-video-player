import historyService from '../../lib/historyService';

export default async function handler(req, res) {
  try {
    const history = await historyService.getHistory(req);
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
