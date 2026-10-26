/**
 * Test-only defaults so modules that read the validated environment can load without a .env file.
 * Values are local placeholders. They are never used outside the test process.
 */
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27018/?replicaSet=rs0&directConnection=true";
process.env.AUTH_SECRET ??= "test-auth-secret-not-for-production-use";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
