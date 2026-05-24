process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-1234567890123456';
delete process.env.DATABASE_URL;
delete process.env.KAFKA_BROKERS;
process.env.INFERENCE_URL = '';
process.env.AML_SERVICE_URL = '';
process.env.MFA_DEV_BYPASS = 'true';
