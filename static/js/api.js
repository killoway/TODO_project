/* api.js */
const API = {
  async getTasks(date) {
    const q = date ? `?date=${date}` : '';
    return (await fetch(`/api/tasks${q}`)).json();
  },
  async addTask(data) {
    return (await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })).json();
  },
  async updateTask(id, data) {
    return (await fetch(`/api/tasks/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })).json();
  },
  async toggleTask(id) {
    return (await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' })).json();
  },
  async deleteTask(id) {
    return fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  },
  async addSubtask(taskId, title) {
    return (await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })).json();
  },
  async toggleSubtask(taskId, subId) {
    return (await fetch(`/api/tasks/${taskId}/subtasks/${subId}/toggle`, { method: 'PATCH' })).json();
  },
  async reorderTasks(arr) {
    return fetch('/api/tasks/reorder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arr),
    });
  },
  async getNote(date) {
    return (await fetch(`/api/notes/${date}`)).json();
  },
  async saveNote(date, content) {
    return fetch(`/api/notes/${date}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  },
  async logPomodoro(taskId, date) {
    return fetch('/api/pomodoros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, date }),
    });
  },
  async getStats() {
    return (await fetch('/api/stats')).json();
  },
};