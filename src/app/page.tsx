'use client';

import { AuthProvider } from '@/auth';
import App from '@/App';

export default function Page() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
