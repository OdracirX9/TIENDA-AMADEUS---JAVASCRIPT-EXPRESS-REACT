import { toasts } from '../signals';

const typeColors = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
};

export function ToastContainer() {
    return (
        <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-32px)] pointer-events-none">
            {toasts.value.map(toast => (
                <div
                    key={toast.id}
                    class={`px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-fade-in flex items-start gap-3 pointer-events-auto ${typeColors[toast.type]}`}
                >
                    <div class="flex-1 text-sm font-medium leading-tight">
                        {toast.text}
                    </div>
                </div>
            ))}
        </div>
    );
}
