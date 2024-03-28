import { Track } from "@jellyfish-dev/react-client-sdk";
import { CloseButton } from "../components/CloseButton";
import { LocalTrack, trackMetadataAtomFamily } from "./Client";
import VideoPlayer from "../components/VideoPlayer";
import { JsonComponent } from "../components/JsonComponent";
import { TrackEncoding } from "@jellyfish-dev/react-client-sdk";
import { useState } from "react";
import { useStore } from "./RoomsContext";
import clsx from "clsx";
import AudioVisualizer from "../components/AudioVisualizer";
import { checkJSON } from "./StreamingSettingsPanel";
import { useAtom } from "jotai";
import { VideoTrackInfo } from "../components/VideoTrackInfo";

type StreamedTrackCardProps = {
  trackInfo: LocalTrack;
  roomId: string;
  peerId: string;
  trackMetadata: string;
  allTracks: Record<string, Track<unknown>> | undefined;
  removeTrack: (trackId: string) => void;
  simulcastTransfer: boolean;
  changeEncoding: (trackId: string, encoding: TrackEncoding, desiredState: boolean) => void;
};

export const StreamedTrackCard = ({
  trackInfo,
  roomId,
  peerId,
  removeTrack,
  simulcastTransfer,
  changeEncoding,
}: StreamedTrackCardProps) => {
  const { state, dispatch } = useStore();
  const [isEncodingActive, setEncodingActive] = useState<boolean[]>([
    trackInfo.encodings?.includes("l") || false,
    trackInfo.encodings?.includes("m") || false,
    trackInfo.encodings?.includes("h") || false,
  ]);

  const createReactClientResult = state.rooms[roomId].peers[peerId].client;
  const reactClient = createReactClientResult.useSelector((s) => s.client);

  const simulcast = useState<boolean>(simulcastTransfer);
  const [expandedTrackId, setExpandedTrackId] = useState<boolean>(false);
  const [userTracksMetadata, setUserTracksMetadata] = useAtom(trackMetadataAtomFamily(peerId));
  const trackMetadata: unknown = userTracksMetadata?.[trackInfo.serverId ?? ""];
  const [newTrackMetadata, setNewTrackMetadata] = useState<string>(trackMetadata ? JSON.stringify(trackMetadata) : "");
  const isTrackMetadataCorrect = checkJSON(newTrackMetadata);

  const updateTrackMetadata = () => {
    const metadata = checkJSON(newTrackMetadata) ? JSON.parse(newTrackMetadata) : null;
    const trackId = trackInfo.serverId;
    if (!trackId) throw new Error("Server id is not present!");
    reactClient?.updateTrackMetadata(trackId, metadata);
    setUserTracksMetadata((prev) => ({
      ...(prev ? prev : {}),
      [trackId]: metadata,
    }));
  };

  return (
    <div className="card w-150 bg-base-100 shadow-xl indicator">
      <div className="card-body p-4 flex flex-col">
        <CloseButton
          onClick={() => {
            if (!trackInfo) return;
            removeTrack(trackInfo.id);
          }}
        />
        <span
          className={`${expandedTrackId ? "whitespace-normal" : "whitespace-nowrap"} cursor-pointer break-all pr-6`}
          onClick={() => setExpandedTrackId(!expandedTrackId)}
        >
          Track ID:{" "}
          {trackInfo.serverId && trackInfo.serverId.length > 20 && !expandedTrackId
            ? `...${trackInfo.serverId.slice(trackInfo.serverId.length - 20, trackInfo.serverId.length)}`
            : trackInfo.serverId}
        </span>
        <div key={trackInfo.id} className="flex flex-col">
          <div className="w-full flex flex-row-reverse place-content-between">
            <div className="w-48  flex ">
              {trackInfo.stream && trackInfo.type !== "audio" ? (
                <div>
                  <VideoPlayer stream={trackInfo.stream} />
                  <VideoTrackInfo track={trackInfo.stream?.getVideoTracks()[0]} />
                </div>
              ) : (
                <div className="indicator">
                  <AudioVisualizer stream={trackInfo.stream} muted={true} />
                </div>
              )}
            </div>
            {simulcast[0] && (
              <div className=" flex-row">
                Active simulcast channels:{" "}
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">Low</span>
                  <input
                    key={trackInfo.id + "l"}
                    type="checkbox"
                    checked={isEncodingActive[0]}
                    className="checkbox"
                    onChange={() => {
                      changeEncoding(trackInfo.serverId || "", "l", !trackInfo.encodings?.includes("l"));
                      setEncodingActive([!isEncodingActive[0], isEncodingActive[1], isEncodingActive[2]]);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">Medium</span>
                  <input
                    key={trackInfo.id + "m"}
                    type="checkbox"
                    checked={isEncodingActive[1]}
                    className="checkbox"
                    onChange={() => {
                      changeEncoding(trackInfo.serverId || "", "m", !trackInfo.encodings?.includes("m"));
                      setEncodingActive([isEncodingActive[0], !isEncodingActive[1], isEncodingActive[2]]);
                    }}
                  />
                </label>
                <label className="label cursor-pointer">
                  <span className="label-text mr-2">High</span>
                  <input
                    key={trackInfo.id + "h"}
                    type="checkbox"
                    checked={isEncodingActive[2]}
                    className="checkbox"
                    onChange={() => {
                      changeEncoding(trackInfo.serverId || "", "l", !trackInfo.encodings?.includes("l"));
                      setEncodingActive([isEncodingActive[0], isEncodingActive[1], !isEncodingActive[2]]);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <details>
              <summary>Metadata editor</summary>
              <div className="flex flex-col gap-2">
                <textarea
                  value={newTrackMetadata || ""}
                  onChange={(e) => {
                    setNewTrackMetadata(e.target.value);
                  }}
                  className={`textarea  textarea-bordered ${isTrackMetadataCorrect ? `` : `border-red-700`} h-60`}
                  placeholder="Client metadata (JSON)"
                />
                <div className="flex flex-row gap-2">
                  <button className="btn btn-sm" onClick={() => setNewTrackMetadata("")}>
                    Clear
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setNewTrackMetadata(trackMetadata ? JSON.stringify(trackMetadata ?? "") : "");
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="btn btn-sm btn-success"
                    disabled={!isTrackMetadataCorrect}
                    onClick={updateTrackMetadata}
                  >
                    Update
                  </button>
                </div>
              </div>
            </details>

            <details>
              <summary>Current metadata</summary>
              <JsonComponent state={trackMetadata} />
            </details>
            <div className="flex flex-row gap-2">
              <button
                className={clsx("btn btn-sm my-2 max-w-xs", trackInfo.enabled ? "btn-error" : "btn-success")}
                onClick={() => {
                  dispatch({
                    type: "SET_TRACK_ENABLE",
                    trackId: trackInfo.id,
                    peerId: peerId,
                    roomId: roomId,
                    enable: !trackInfo.enabled,
                  });
                }}
              >
                {trackInfo.enabled ? "Disable track" : "Enable track"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
