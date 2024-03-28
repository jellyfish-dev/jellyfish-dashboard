import { CreateConfig } from "@jellyfish-dev/react-client-sdk";

export const NEW_CLIENT_CREATE_CONFIG: CreateConfig<unknown, unknown> = {
    reconnect: {
        delay: 5000,
        initialDelay: 0,
        maxAttempts: 1,
        addTracksOnReconnect: false,
    },
}
