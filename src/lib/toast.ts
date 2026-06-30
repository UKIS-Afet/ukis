export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const existing = document.getElementById('global-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'global-toast';
  toast.className = `fixed bottom-4 right-4 z-[9999] px-4 py-3 rounded-xl shadow-lg font-bold text-sm transform transition-all duration-300 translate-y-0 opacity-100 ${
    type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  }`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
