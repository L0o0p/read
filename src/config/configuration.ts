export default () => ({
    database: {
        url: process.env.DATABASE_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: '1d',
    },
    dify: {
        apiKey: process.env.DIFY_API_KEY,
        endpoint: process.env.DIFY_API_ENDPOINT,
    },
});