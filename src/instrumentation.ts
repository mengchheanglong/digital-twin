export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    try {
      const dbConnect = (await import('@/lib/db')).default;
      await dbConnect();
    } catch (error) {
      console.error('MongoDB instrumentation connection failed:', error);
    }
  }
}
