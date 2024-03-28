import { Client } from "@jellyfish-dev/react-client-sdk";
import { useEffect } from "react";
import { settingsSelectorAtom } from "./LogSelector";
import { useAtom } from "jotai";

const onJoinErrorAtom = settingsSelectorAtom("onJoinError");
const onJoinSuccessAtom = settingsSelectorAtom("onJoinSuccess");
const onPeerJoinedAtom = settingsSelectorAtom("onPeerJoined");
const onPeerUpdatedAtom = settingsSelectorAtom("onPeerUpdated");
const onPeerLeftAtom = settingsSelectorAtom("onPeerLeft");
const onTrackReadyAtom = settingsSelectorAtom("onTrackReady");
const onTrackAddedAtom = settingsSelectorAtom("onTrackAdded");
const onTrackRemovedAtom = settingsSelectorAtom("onTrackRemoved");
const onTrackUpdatedAtom = settingsSelectorAtom("onTrackUpdated");
const onBandwidthEstimationChangedAtom = settingsSelectorAtom("onBandwidthEstimationChanged");
const onTracksPriorityChangedAtom = settingsSelectorAtom("onTracksPriorityChanged");
const onEncodingChangedAtom = settingsSelectorAtom("onEncodingChanged");
const onVoiceActivityChangedAtom = settingsSelectorAtom("onVoiceActivityChanged");

// TODO: refactor this
export const useLogging = <P, T>(client: Client<P, T> | null) => {
  const [onJoinErrorLog] = useAtom(onJoinErrorAtom);
  const [onJoinSuccessLog] = useAtom(onJoinSuccessAtom);
  const [onPeerJoinedLog] = useAtom(onPeerJoinedAtom);
  const [onPeerUpdatedLog] = useAtom(onPeerUpdatedAtom);
  const [onPeerLeftLog] = useAtom(onPeerLeftAtom);
  const [onTrackReadyLog] = useAtom(onTrackReadyAtom);
  const [onTrackAddedLog] = useAtom(onTrackAddedAtom);
  const [onTrackRemovedLog] = useAtom(onTrackRemovedAtom);
  const [onTrackUpdatedLog] = useAtom(onTrackUpdatedAtom);
  const [onBandwidthEstimationChangedLog] = useAtom(onBandwidthEstimationChangedAtom);
  const [onTracksPriorityChangedLog] = useAtom(onTracksPriorityChangedAtom);
  const [onEncodingChangedLog] = useAtom(onEncodingChangedAtom);
  const [onVoiceActivityChangedLog] = useAtom(onVoiceActivityChangedAtom);

  useEffect(() => {
    if (!client) return;

    /* eslint-disable @typescript-eslint/no-explicit-any, no-console */

    const onJoinSuccess = (peerId: any, peersInRoom: any) => {
      if (onJoinSuccessLog) {
        console.log({ name: "onJoinSuccess", peerId, peersInRoom });
      }
    };

    const onJoinError = (metadata: any) => {
      if (onJoinErrorLog) {
        console.log({ name: "onJoinError", metadata });
      }
    };

    const onPeerJoined = (peer: any) => {
      if (onPeerJoinedLog) {
        console.log({ name: "onPeerJoined", peer });
      }
    };

    const onPeerUpdated = (peer: any) => {
      if (onPeerUpdatedLog) {
        console.log({ name: "onPeerUpdated", peer });
      }
    };

    const onPeerLeft = (peer: any) => {
      if (onPeerLeftLog) {
        console.log({ name: "onPeerLeft", peer });
      }
    };

    const onTrackReady = (ctx: any) => {
      if (onTrackReadyLog) {
        console.log({ name: "onTrackReady", ctx });
      }
    };

    const onTrackAdded = (ctx: any) => {
      if (onTrackAddedLog) {
        console.log({ name: "onTrackAdded", ctx });
      }

      // todo remove this callback in useEffect return
      ctx.on("onEncodingChanged", (context: any) => {
        if (onEncodingChangedLog) {
          console.log({ name: "onEncodingChanged", context });
        }
      });

      ctx.on("onVoiceActivityChanged", (context: any) => {
        if (onVoiceActivityChangedLog) {
          console.log({ name: "onVoiceActivityChanged", context });
        }
      });
    };

    const onTrackRemoved = (ctx: any) => {
      if (onTrackRemovedLog) {
        console.log({ name: "onTrackRemoved", ctx });
      }
    };

    const onTrackUpdated = (ctx: any) => {
      if (onTrackUpdatedLog) {
        console.log({ name: "onTrackUpdated", ctx });
      }
    };

    const onBandwidthEstimationChanged = (estimation: any) => {
      if (onBandwidthEstimationChangedLog) {
        console.log({ name: "onBandwidthEstimationChanged", estimation });
      }
    };

    const onTracksPriorityChanged = (enabledTracks: any, disabledTracks: any) => {
      if (onTracksPriorityChangedLog) {
        console.log({
          name: "onTracksPriorityChanged",
          enabledTracks,
          disabledTracks,
        });
      }
    };

    const onAuthError = () => {
      console.log("onAuthError");
    };

    const onConnectionError = (_message: string) => {
      console.log("onConnectionError");
    };

    const onSocketError = () => {
      console.log("onSocketError");
    };

    /* eslint-enable @typescript-eslint/no-explicit-any, no-console */

    client.on("joined", onJoinSuccess);
    client.on("joinError", onJoinError);
    // client.on("onRemoved", onJoinRemove);
    client.on("peerJoined", onPeerJoined);
    client.on("peerUpdated", onPeerUpdated);
    client.on("peerLeft", onPeerLeft);
    client.on("trackReady", onTrackReady);
    client.on("trackAdded", onTrackAdded);
    client.on("trackRemoved", onTrackRemoved);
    client.on("trackUpdated", onTrackUpdated);
    client.on("bandwidthEstimationChanged", onBandwidthEstimationChanged);

    client.on("authError", onAuthError);
    client.on("connectionError", onConnectionError);
    client.on("socketError", onSocketError);

    return () => {
      client.off("joined", onJoinSuccess);
      client.off("joinError", onJoinError);
      // client.off("onRemoved", onJoinRemove);
      client.off("peerJoined", onPeerJoined);
      client.off("peerUpdated", onPeerUpdated);
      client.off("peerLeft", onPeerLeft);
      client.off("trackReady", onTrackReady);
      client.off("trackAdded", onTrackAdded);
      client.off("trackRemoved", onTrackRemoved);
      client.off("trackUpdated", onTrackUpdated);
      client.off("bandwidthEstimationChanged", onBandwidthEstimationChanged);

      client.off("authError", onAuthError);
      client.off("connectionError", onConnectionError);
      client.off("socketError", onSocketError);
    };
  }, [
    client,
    onBandwidthEstimationChangedLog,
    onEncodingChangedLog,
    onJoinErrorLog,
    onJoinSuccessLog,
    onPeerJoinedLog,
    onPeerLeftLog,
    onPeerUpdatedLog,
    onTrackAddedLog,
    onTrackReadyLog,
    onTrackRemovedLog,
    onTrackUpdatedLog,
    onTracksPriorityChangedLog,
    onVoiceActivityChangedLog,
  ]);
};
