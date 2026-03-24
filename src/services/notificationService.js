import api from './api';

const normalizeNotification = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id = item.id ?? item._id ?? item.uuid ?? item.notificationId;
  if (!id) {
    return null;
  }

  const type = String(item.type || item.level || item.severity || 'info').toLowerCase();
  const title = item.title || item.subject || item.name || 'Notification';
  const message = item.message || item.body || item.description || '';
  const target = item.target || item.link || item.url || null;
  const createdAt = item.createdAt || item.timestamp || item.date || null;
  const read = Boolean(item.read || item.isRead || item.readAt);

  return {
    id,
    type,
    title,
    message,
    target,
    createdAt,
    read
  };
};

export const notificationService = {
  list: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    const payload = response?.data;
    const items = Array.isArray(payload) ? payload : payload?.data || [];
    return items.map(normalizeNotification).filter(Boolean);
  },
  markRead: async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
  }
};
