export function instagramConfig() {
  return {
    appId: process.env.INSTAGRAM_APP_ID,
    appSecret: process.env.INSTAGRAM_APP_SECRET,
    graphVersion: process.env.INSTAGRAM_GRAPH_API_VERSION ?? process.env.META_GRAPH_API_VERSION,
    callbackUrl: process.env.INSTAGRAM_OAUTH_CALLBACK_URL,
  };
}

export function instagramConfigured() {
  const config = instagramConfig();
  return Boolean(config.appId && config.appSecret && config.graphVersion && config.callbackUrl && process.env.SOCIAL_TOKEN_ENCRYPTION_KEY);
}
