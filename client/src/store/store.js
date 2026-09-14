import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (part, qty = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.partId === part._id);
          if (existingItem) {
            return {
              items: state.items.map(item =>
                item.partId === part._id
                  ? { ...item, qty: item.qty + qty }
                  : item
              ),
            };
          }
          return { items: [...state.items, { partId: part._id, qty, ...part }] };
        });
      },
      removeItem: (partId) => {
        set((state) => ({
          items: state.items.filter(item => item.partId !== partId)
        }));
      },
      updateItemQty: (partId, qty) => {
        set((state) => ({
          items: state.items.map(item =>
            item.partId === partId ? { ...item, qty } : item
          )
        }));
      },
      clearCart: () => set({ items: [] }),
      getCartTotal: () => {
        return get().items.reduce((total, item) => {
          const price = item.discountPercent > 0 
            ? Math.round(item.price * (1 - item.discountPercent / 100)) 
            : item.price;
          return total + price * item.qty;
        }, 0);
      }
    }),
    {
      name: 'cart-storage',
    }
  )
);

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => {
        localStorage.setItem('apToken', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('apToken');
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const useConfigStore = create((set) => ({
  config: {},
  setConfig: (config) => set({ config }),
}));
