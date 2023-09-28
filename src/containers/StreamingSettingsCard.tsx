import { TrackEncoding } from "@jellyfish-dev/react-client-sdk/.";
import { DeviceIdToStream, StreamingDeviceSelector } from "../components/StreamingDeviceSelector";
import { StreamingSettingsPanel } from "./StreamingSettingsPanel";
import { DeviceTile } from "../components/DeviceTile";
import { LocalTrack } from "./Client";
import { useState } from "react";
import { useStore } from "./RoomsContext";

const streamedFromThisSource = (tracks: Record<string, LocalTrack>, streamId: string) => {
  return Object.values(tracks).filter((track) => track.stream.id === streamId);
};

export type DeviceInfo = {
  id: string;
  type: string;
  stream: MediaStream;
};

type StreamingSettingsCardProps = {
  id: string;
  setSimulcast: (isActive: boolean) => void;
  simulcast: boolean;
  trackMetadata: string | null;
  setTrackMetadata: (value: string | null) => void;
  maxBandwidth: string | null;
  setMaxBandwidth: (value: string | null) => void;
  attachMetadata: boolean;
  setAttachMetadata: (value: boolean) => void;
  addLocalStream: (stream: MediaStream, id: string) => void;
  currentEncodings: TrackEncoding[];
  setCurrentEncodings: (value: TrackEncoding[]) => void;
  addAudioTrack: (stream: MediaStream) => void;
  addVideoTrack: (stream: MediaStream) => void;
  tracks: Record<string, LocalTrack>;
};

export const StreamingSettingsCard = ({
  addVideoTrack,
  addAudioTrack,
  id,
  setSimulcast,
  setTrackMetadata,
  trackMetadata,
  maxBandwidth,
  setMaxBandwidth,
  simulcast,
  attachMetadata,
  setAttachMetadata,
  addLocalStream,
  currentEncodings,
  setCurrentEncodings,
  tracks,
}: StreamingSettingsCardProps) => {
  const { state } = useStore();
  const [selectedId, setSelectedId] = useState<DeviceInfo | null>(null);
  const [activeStreams, setActiveStreams] = useState<DeviceIdToStream | null>(null);
  return (
    <div className="content-start place-content-between top-40 bottom-1/4 justify-start">
      <StreamingDeviceSelector
        id={id}
        selectedDeviceId={selectedId}
        addLocalStream={addLocalStream}
        setSelectedDeviceId={setSelectedId}
      />

      <div className="flex flex-row flex-wrap gap-2 p-4 justify-center">
        {Object.entries(state.rooms[state.selectedRoom || ""].peers[id].tracks || {}).map(([_, streamInfo]) => (
          <div key={streamInfo.id} className=" w-40">
            <DeviceTile
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              id={id}
              streamedTracks={streamedFromThisSource(tracks, streamInfo.stream.id)}
              activeStreams={activeStreams}
              setActiveStreams={setActiveStreams}
              key={streamInfo.id}
              streamInfo={streamInfo}
              addAudioTrack={addAudioTrack}
              addVideoTrack={addVideoTrack}
            />
          </div>
        ))}
      </div>

      <StreamingSettingsPanel
        id={id}
        setSimulcast={setSimulcast}
        simulcast={simulcast}
        trackMetadata={trackMetadata}
        setTrackMetadata={setTrackMetadata}
        maxBandwidth={maxBandwidth}
        setMaxBandwidth={setMaxBandwidth}
        attachMetadata={attachMetadata}
        setAttachMetadata={setAttachMetadata}
        currentEncodings={currentEncodings}
        setCurrentEncodings={setCurrentEncodings}
        selectedDeviceId={selectedId}
        addAudioTrack={addAudioTrack}
        addVideoTrack={addVideoTrack}
      />
    </div>
  );
};
