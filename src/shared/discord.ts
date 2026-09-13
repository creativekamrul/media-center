/** Public application ID, not a bot token or client secret. Custom IDs stay optional. */
export const DEFAULT_DISCORD_APPLICATION_ID = '1546622716554121296'
export const discordApplicationId = (custom: string) => custom.trim() || DEFAULT_DISCORD_APPLICATION_ID
