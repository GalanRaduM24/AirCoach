export const mockAgentAdvice = [
  {
    id: 1,
    title: 'Window Opening Recommendation',
    message: 'Current AQI is 65 (Moderate). Windows are safe to open for 10-15 minutes in the morning or evening. Avoid midday when traffic is high.',
    icon: '🪟',
    priority: 'medium',
  },
  {
    id: 2,
    title: 'Health Alert',
    message: 'PM2.5 levels are elevated. Consider wearing a mask if going outside, especially if you have respiratory issues.',
    icon: '😷',
    priority: 'high',
  },
  {
    id: 3,
    title: 'UV Protection',
    message: 'UV index is low (2). Minimal sun protection needed today, but apply sunscreen if spending extended time outdoors.',
    icon: '☀️',
    priority: 'low',
  },
  {
    id: 4,
    title: 'Air Purifier Suggestion',
    message: 'Keep your air purifier in auto mode. It will detect when AQI spikes and adjust automatically.',
    icon: '💨',
    priority: 'medium',
  },
];

export const mockChatHistory = [
  {
    id: 1,
    sender: 'user',
    message: 'Is it safe to open my windows?',
    timestamp: new Date(Date.now() - 10 * 60000),
  },
  {
    id: 2,
    sender: 'agent',
    message: 'Based on current conditions, yes! AQI is 65 (Moderate). I recommend opening windows in early morning (6-9 AM) or evening (6-8 PM) when traffic is lower. Avoid midday.',
    timestamp: new Date(Date.now() - 9 * 60000),
  },
  {
    id: 3,
    sender: 'user',
    message: 'Should I use my purifier?',
    timestamp: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 4,
    sender: 'agent',
    message: 'Your air purifier is excellent. I recommend keeping it on auto mode to handle fluctuations. It will automatically increase speed when AQI rises.',
    timestamp: new Date(Date.now() - 4 * 60000),
  },
];
