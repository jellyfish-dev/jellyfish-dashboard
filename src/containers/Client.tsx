import { Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { JsonComponent } from "../components/JsonComponent";
import { getArrayValue, getStringValue, useLocalStorageState } from "../components/LogSelector";
import { CloseButton } from "../components/CloseButton";
import { BadgeStatus } from "../components/Badge";
import { CopyToClipboardButton } from "../components/CopyButton";
import { useServerSdk } from "../components/ServerSdkContext";
import { useLogging } from "../components/useLogging";
import { useConnectionToasts } from "../components/useConnectionToasts";
import { showToastError, showToastInfo } from "../components/Toasts";
import { SignalingUrl, TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useStore } from "./RoomsContext";
import { getBooleanValue } from "../utils/localStorageUtils";
import { VscClose } from "react-icons/vsc";
import { StreamedTrackCard } from "./StreamedTrackCard";
import { ReceivedTrackPanel } from "./ReceivedTrackPanel";
import { GenerateQRCodeButton } from "../components/GenerateQRCodeButton";
import { DeviceInfo, StreamingSettingsCard } from "./StreamingSettingsCard";
import { checkJSON } from "./StreamingSettingsPanel";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { useSetAtom } from "jotai";
import { ComponentOptionsHLSSubscribeModeEnum } from "../server-sdk";

type ClientProps = {
  roomId: string;
  peerId: string;
  token: string | null;
  id: string;
  status?: "disconnected" | "connected";
  refetchIfNeeded: () => void;
  remove: (roomId: string) => void;
  setToken: (token: string) => void;
  removeToken: () => void;
  hlsMode?: ComponentOptionsHLSSubscribeModeEnum;
};

export const createDefaultTrackMetadata = (type: string) =>
  JSON.stringify({
    name: "track-name",
    type,
  });

export const createDefaultClientMetadata = (clientId: string) =>
  JSON.stringify({
    clientId: clientId,
  });

export type TrackSource = "mock" | "navigator";

export type LocalTrack = {
  id: string;
  isMetadataOpened: boolean;
  type: "audio" | "video" | "screenshare";
  simulcast?: boolean;
  encodings?: TrackEncoding[];
  stream: MediaStream;
  track: MediaStreamTrack;
  enabled: boolean;
  serverId?: string;
  source: TrackSource;
  stop?: () => void;
};

export type TrackId = string;
export const trackMetadataAtomFamily = atomFamily((clientId) =>
  atomWithStorage<Record<TrackId, unknown> | null>(`track-metadata-${clientId}`, null),
);

const prepareHlsButtonMessage = (hlsMode?: ComponentOptionsHLSSubscribeModeEnum): string | null => {
  if (hlsMode === undefined) return "There is no HLS component in this room";
  if (hlsMode === "auto") return "HLS is in automatic subscription mode";
  else return null;
};

type ClientContextProviderProps = {
  roomId: string;
  peerId: string;
  children: ReactNode;
};

export const ClientContextProvider = ({ roomId, peerId, children }: ClientContextProviderProps) => {
  const { state } = useStore();
  const JellyfishContextProvider = state.rooms[roomId].peers[peerId].client.JellyfishContextProvider;

  return <JellyfishContextProvider>{children}</JellyfishContextProvider>;
};

export const Client = ({
  roomId,
  peerId,
  token,
  id,
  status,
  refetchIfNeeded,
  remove,
  removeToken,
  setToken,
  hlsMode,
}: ClientProps) => {
  const { state, dispatch } = useStore();
  const client = state.rooms[roomId].peers[peerId].client;
  const tracks = state.rooms[roomId].peers[peerId].tracks || [];

  const connect = client.useConnect();
  const disconnect = client.useDisconnect();
  const fullState = client.useSelector((snapshot) => ({
    local: snapshot.local,
    remote: snapshot.remote,
    bandwidthEstimation: snapshot.bandwidthEstimation,
    status: snapshot.status,
    tracks: snapshot.tracks,
  }));

  const reactClient = client.useSelector((snapshot) => snapshot.client);
  const { signalingHost, signalingPath, signalingURISchema, hlsApi } = useServerSdk();
  const [showClientState, setShowClientState] = useLocalStorageState(`show-client-state-json-${peerId}`);
  const [attachClientMetadata, setAttachClientMetadata] = useLocalStorageState(`attach-client-metadata-${peerId}`);
  const [showMetadataEditor, setShowMetadataEditor] = useLocalStorageState(`show-metadata-editor-${peerId}`);
  const [clientMetadata, setClientMetadata] = useState<string>(createDefaultClientMetadata(id));
  const isClientMetadataCorrect = checkJSON(clientMetadata);
  const [expandedToken, setExpandedToken] = useState(false);
  const [tokenInput, setTokenInput] = useState<string>("");
  const statusRef = useRef(fullState?.status);
  statusRef.current = fullState?.status;
  const isThereAnyTrack = Object.keys(fullState?.tracks || {}).length > 0;

  useLogging(reactClient);
  useConnectionToasts(reactClient);
  const [maxBandwidth, setMaxBandwidth] = useState<string | null>(getStringValue("max-bandwidth"));
  const [trackMetadata, setTrackMetadata] = useState<string | null>(getStringValue("track-metadata"));
  const [attachMetadata, setAttachMetadata] = useState(getBooleanValue("attach-metadata", false));
  const [simulcastTransfer, setSimulcastTransfer] = useState(getBooleanValue("simulcast"));

  const [currentEncodings, setCurrentEncodings] = useState(
    (getArrayValue("current-encodings") as TrackEncoding[]) || ["h", "m", "l"],
  );

  const connectionErrorTimeoutId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!reactClient) return;

    const cb = () => {
      if (connectionErrorTimeoutId.current) {
        clearInterval(connectionErrorTimeoutId.current);
      }
      connectionErrorTimeoutId.current = null;
    };

    reactClient.on("joined", cb);

    return () => {
      reactClient?.removeListener("joined", cb);
    };
  }, [reactClient]);

  const changeEncodingReceived = (trackId: string, encoding: TrackEncoding) => {
    if (!fullState) return;
    reactClient?.setTargetTrackEncoding(trackId, encoding);
  };

  const changeEncoding = (trackId: string, encoding: TrackEncoding, desiredState: boolean) => {
    if (!trackId) return;
    if (desiredState) {
      reactClient?.enableTrackEncoding(trackId, encoding);
    } else {
      reactClient?.disableTrackEncoding(trackId, encoding);
    }
  };

  const addLocalStream = (stream: MediaStream, id: string, source: TrackSource, stop?: () => void) => {
    stream.getVideoTracks().forEach((track) => {
      if (id.includes("screenshare")) {
        dispatch({
          type: "ADD_TRACK",
          roomId: roomId,
          peerId: peerId,
          track: {
            id: id,
            track: track,
            stream: stream,
            isMetadataOpened: false,
            type: "screenshare",
            simulcast: false,
            encodings: currentEncodings,
            enabled: true,
            source,
            stop,
          },
        });
      } else {
        dispatch({
          type: "ADD_TRACK",
          roomId: roomId,
          peerId: peerId,
          track: {
            id: id,
            track: track,
            stream: stream,
            isMetadataOpened: false,
            type: "video",
            simulcast: simulcastTransfer,
            encodings: currentEncodings,
            enabled: true,
            source,
            stop,
          },
        });
      }
    });
    stream.getAudioTracks().forEach((track) => {
      dispatch({
        type: "ADD_TRACK",
        roomId: roomId,
        peerId: peerId,
        track: {
          id: id,
          track: track,
          stream: stream,
          isMetadataOpened: false,
          type: "audio",
          enabled: true,
          source,
          stop,
        },
      });
    });
  };
  const setUserTracksMetadata = useSetAtom(trackMetadataAtomFamily(id));

  const addVideoTrack = async (trackInfo: DeviceInfo) => {
    const track: MediaStreamTrack = trackInfo.stream?.getVideoTracks()[0];
    if (!trackInfo.stream || !track) return;

    const metadata = attachMetadata
      ? JSON.parse(trackMetadata?.trim() || createDefaultTrackMetadata(trackInfo.type))
      : undefined;

    const trackId = await reactClient?.addTrack(
      track,
      trackInfo.stream,
      metadata,
      {
        enabled: trackInfo.type === "video" && simulcastTransfer,
        activeEncodings: currentEncodings,
        disabledEncodings: [],
      },
      parseInt(maxBandwidth || "0") || undefined,
    );
    dispatch({
      type: "SET_TRACK_STREAMED",
      roomId: roomId,
      peerId: peerId,
      trackId: trackInfo.id || "",
      serverId: trackId || "",
    });
    if (!trackId) throw Error("Adding track error!");

    setUserTracksMetadata((prev) => ({
      ...(prev ? prev : {}),
      [trackId]: metadata,
    }));
  };

  const addAudioTrack = async (trackInfo: DeviceInfo) => {
    const track: MediaStreamTrack = trackInfo.stream?.getAudioTracks()[0];
    if (!trackInfo.stream || !track) return;
    const trackId = await reactClient?.addTrack(
      track,
      trackInfo.stream,
      attachMetadata ? JSON.parse(trackMetadata?.trim() || createDefaultTrackMetadata(trackInfo.type)) : undefined,
      undefined,
      parseInt(maxBandwidth || "0") || undefined,
    );
    dispatch({
      type: "SET_TRACK_STREAMED",
      roomId: roomId,
      peerId: peerId,
      trackId: trackInfo.id || "",
      serverId: trackId || "",
    });
    if (!trackId) throw Error("Adding track error!");
  };

  const hlsMessage = prepareHlsButtonMessage(hlsMode);

  return (
    <div className="flex flex-col gap-1 mx-1">
      <div className="card w-150 bg-base-100 shadow-xl indicator">
        <CloseButton
          onClick={() => {
            remove(roomId);
            setTimeout(() => {
              refetchIfNeeded();
            }, 500);
          }}
        />
        <div className="card-body p-4">
          <div className="flex flex-row justify-between gap-2 items-center">
            <h1 className="card-title relative">
              <div className="z-10">
                Peer: <span className="text-xs">{peerId}</span>
              </div>
              <div className="tooltip tooltip-top tooltip-primary absolute -ml-3 -mt-1 " data-tip={fullState?.status}>
                <BadgeStatus status={fullState?.status} />
              </div>
              <CopyToClipboardButton text={peerId} />
            </h1>

            <div className="tooltip" data-tip="Attach metadata">
              <input
                className="checkbox"
                id={id}
                type="checkbox"
                checked={attachClientMetadata}
                onChange={() => {
                  setAttachClientMetadata(!attachClientMetadata);
                }}
              />
            </div>

            {fullState.status === "joined" ? (
              <button
                className="btn btn-sm btn-error"
                onClick={() => {
                  disconnect();
                  dispatch({
                    type: "RESET_PEER",
                    roomId: roomId,
                    peerId: peerId,
                  });
                  setTimeout(() => {
                    refetchIfNeeded();
                  }, 500);
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                className="btn btn-sm btn-success"
                disabled={!token || status === "connected"}
                onClick={() => {
                  if (!token) {
                    showToastError("Cannot connect to Jellyfish server because token is empty");
                    return;
                  }
                  const singling: SignalingUrl | undefined =
                    signalingHost && signalingURISchema && signalingPath
                      ? {
                          host: signalingHost,
                          protocol: signalingURISchema,
                          path: signalingPath,
                        }
                      : undefined;

                  const metadata = checkJSON(clientMetadata) ? JSON.parse(clientMetadata) : null;

                  connect({
                    peerMetadata: attachClientMetadata ? metadata : null,
                    token,
                    signaling: singling,
                  });
                  setTimeout(() => {
                    refetchIfNeeded();
                  }, 500);
                  connectionErrorTimeoutId.current = setTimeout(() => {
                    if (statusRef.current === "joined") return;
                    disconnect();
                    showToastError("Unable to connect, try again");
                  }, 3000);
                }}
              >
                Connect
              </button>
            )}
          </div>
          <button
            className="btn btn-sm btn-warning"
            onClick={() => {
              reactClient["client"]["websocket"].close();
            }}
          >
            ws-close
          </button>

          <div className="flex flex-row items-center">
            {token ? (
              <div className="flex flex-shrink flex-auto justify-between">
                <div id="textContainer" className="overflow-hidden ">
                  <span
                    className={`${
                      expandedToken ? "whitespace-normal" : "whitespace-nowrap"
                    } cursor-pointer break-all pr-6`}
                    onClick={() => setExpandedToken(!expandedToken)}
                  >
                    Token:{" "}
                    {token.length > 20 && !expandedToken ? `...${token.slice(token.length - 20, token.length)}` : token}
                  </span>
                </div>
                <div className="flex flex-auto flex-wrap place-items-center justify-between">
                  <div>
                    <CopyToClipboardButton text={token} />
                    <GenerateQRCodeButton
                      textToQR={token}
                      description={"Scan this QR Code to access the token from your mobile device:"}
                    />
                  </div>

                  {token && (
                    <button
                      className="btn btn-sm mx-1 my-0 btn-error  tooltip tooltip-error  tooltip-top z-10"
                      data-tip={"REMOVE"}
                      onClick={removeToken}
                    >
                      <VscClose size={20} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                  onChange={(e) => {
                    setTokenInput(e.target.value.trim());
                  }}
                />
                <button className="btn btn-sm m-2 btn-success" onClick={() => setToken(tokenInput)}>
                  Save token
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-row flex-wrap content-start justify-between items-center">
            <label className="label cursor-pointer">
              <input
                className="checkbox"
                id={id}
                type="checkbox"
                checked={showMetadataEditor}
                onChange={() => {
                  setShowMetadataEditor(!showMetadataEditor);
                }}
              />
              <span className="text ml-2">Show metadata editor</span>
            </label>
            <div className="tooltip tooltip-info z-10" data-tip={hlsMessage}>
              <button
                className="btn btn-sm btn-warning"
                disabled={hlsMode !== "manual"}
                onClick={() => {
                  hlsApi
                    ?.subscribeHlsTo(roomId, {
                      origins: [peerId],
                    })
                    .then(() => {
                      showToastInfo(`Subscribed to all tracks of the user ${peerId}`);
                    })
                    .catch((e) => {
                      console.error(e);
                      showToastError(`Subscribing peer ${peerId} failed`);
                    });
                }}
              >
                Add to hls
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {showMetadataEditor && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={clientMetadata || ""}
                  onChange={(e) => {
                    setClientMetadata(e.target.value);
                  }}
                  className={`textarea  textarea-bordered ${isClientMetadataCorrect ? `` : `border-red-700`} h-60`}
                  placeholder="Client metadata (JSON)"
                ></textarea>
                <div className="flex flex-row gap-2">
                  <button className="btn btn-sm" onClick={() => setClientMetadata("{}")}>
                    Clear
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setClientMetadata(createDefaultClientMetadata(id));
                    }}
                  >
                    Reset to default
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    disabled={!isClientMetadataCorrect || fullState.status !== "joined"}
                    onClick={() => {
                      const metadata = checkJSON(clientMetadata) ? JSON.parse(clientMetadata) : null;
                      reactClient?.updatePeerMetadata(metadata);
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <button
              className="btn btn-sm"
              onClick={() => {
                setShowClientState(!showClientState);
              }}
            >
              {showClientState ? "Hide react client state" : "Show react client state"}
            </button>
          </div>
          <div className="flex flex-col">{showClientState && <JsonComponent state={fullState} />}</div>
        </div>
      </div>
      {fullState.status === "joined" &&
        Object.values(tracks)
          .filter((track) => track.serverId)
          .map((track) => (
            <Fragment key={track?.id || "nope"}>
              {track && (
                <StreamedTrackCard
                  trackInfo={track}
                  peerId={peerId}
                  roomId={roomId}
                  allTracks={fullState?.local?.tracks || {}}
                  trackMetadata={trackMetadata ?? ""}
                  removeTrack={(trackId) => {
                    if (!trackId) return;
                    reactClient?.removeTrack(tracks[trackId].serverId || "");
                    dispatch({
                      type: "SET_TRACK_STREAMED",
                      roomId: roomId,
                      peerId: peerId,
                      trackId: trackId,
                      serverId: undefined,
                    });
                  }}
                  changeEncoding={changeEncoding}
                  simulcastTransfer={track.type === "video" ? simulcastTransfer : false}
                />
              )}
            </Fragment>
          ))}
      {fullState.status === "joined" && (
        <div className="card w-150 bg-base-100 shadow-xl indicator">
          <div className="card-body p-4">
            <StreamingSettingsCard
              addVideoTrack={addVideoTrack}
              addAudioTrack={addAudioTrack}
              id={peerId}
              attachMetadata={attachMetadata}
              setAttachMetadata={setAttachMetadata}
              simulcast={simulcastTransfer}
              setSimulcast={setSimulcastTransfer}
              trackMetadata={trackMetadata}
              setTrackMetadata={setTrackMetadata}
              maxBandwidth={maxBandwidth}
              setMaxBandwidth={setMaxBandwidth}
              addLocalStream={addLocalStream}
              currentEncodings={currentEncodings}
              setCurrentEncodings={setCurrentEncodings}
            />
          </div>
        </div>
      )}
      {fullState.status === "joined" && isThereAnyTrack && (
        <div className="card w-150 bg-base-100 shadow-xl indicator">
          <div className="card-body p-4">
            <h1 className="card-title">Remote tracks:</h1>
            {Object.values(fullState?.tracks || {}).map(
              ({ trackId, metadata, origin, stream, vadStatus, encoding, track, simulcastConfig }) => {
                return (
                  <div key={trackId}>
                    <h4>From: {origin.id}</h4>
                    <div>
                      <ReceivedTrackPanel
                        key={trackId}
                        vadStatus={vadStatus}
                        encodingReceived={encoding}
                        clientId={peerId}
                        trackId={trackId}
                        stream={stream}
                        trackMetadata={metadata}
                        changeEncodingReceived={changeEncodingReceived}
                        kind={track?.kind}
                        simulcastConfig={simulcastConfig}
                      />
                    </div>
                  </div>
                );
              },
            )}
            <h4>Current bandwidth: {Math.round(Number(fullState.bandwidthEstimation)).toString()}</h4>
          </div>
        </div>
      )}
    </div>
  );
};
