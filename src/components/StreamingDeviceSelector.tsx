import { useState } from "react";
import { createStream } from "../utils/createMockStream";
import { VideoDevicePanel } from "./VideoDevicePanel";
import { CanvasTile } from "./CanvasTile";
import { AudioDevicePanel } from "./AudioDevicePanel";
import { DeviceInfo } from "../containers/StreamingSettingsPanel";
import { EnumerateDevices, enumerateDevices } from "../utils/browser-media-utils";
import { DeviceTile } from "./DeviceTile";

export type StreamInfo = {
  stream: MediaStream;
  id: string;
};
export type DeviceIdToStream = Record<string, StreamInfo>;

type Props = {
  selectedDeviceId: DeviceInfo | null;
  setSelectedDeviceId: (cameraId: DeviceInfo | null) => void;
  activeStreams: DeviceIdToStream | null;
  setActiveStreams: (setter: ((prev: DeviceIdToStream | null) => DeviceIdToStream) | DeviceIdToStream | null) => void;
};

export const heartStream: StreamInfo = {
  stream: createStream("💜", "black", "high", 24).stream,
  id: "HEART_STREAM",
};
export const frogStream: StreamInfo = {
  stream: createStream("🐸", "black", "high", 24).stream,
  id: "FROG_STREAM",
};
export const elixirStream: StreamInfo = {
  stream: createStream("🧪", "black", "high", 24).stream,
  id: "ELIXIR_STREAM",
};
export const octopusStream: StreamInfo = {
  stream: createStream("🐙", "black", "high", 24).stream,
  id: "OCTOPUS_STREAM",
};

const mockStreams = [octopusStream, elixirStream, frogStream, heartStream];

export const mockStreamNames = mockStreams.map((stream) => stream.id);

export const StreamingDeviceSelector = ({
  selectedDeviceId,
  setSelectedDeviceId,
  activeStreams,
  setActiveStreams,
}: Props) => {
  const [enumerateDevicesState, setEnumerateDevicesState] = useState<EnumerateDevices | null>(null);

  return (
    <div>
      {enumerateDevicesState?.video.type !== "OK" && (
        <button
          className="btn btn-sm btn-info  my-2 w-full"
          onClick={() => {
            enumerateDevices({}, {})
              .then((result) => {
                setEnumerateDevicesState(result);
              })
              .catch((error) => {
                console.log("Error caught " + error);
                setEnumerateDevicesState(error);
              });
            console.log(activeStreams);
          }}
        >
          List devices
        </button>
      )}

      <div className="flex place-content-center align-baseline   flex-wrap w-full">
        {enumerateDevicesState?.video.type === "OK" &&
          enumerateDevicesState.video.devices.map(({ deviceId, label }) => (
            <div key={deviceId} className="join-item w-full">
              <VideoDevicePanel
                activeStreams={activeStreams}
                key={deviceId}
                deviceId={deviceId}
                label={label}
                setActiveVideoStreams={setActiveStreams}
                setSelectedVideoId={setSelectedDeviceId}
                selected={selectedDeviceId?.id === deviceId}
                streamInfo={(activeStreams && activeStreams[deviceId]) || null}
              />
            </div>
          ))}

        {enumerateDevicesState?.audio.type === "OK" &&
          enumerateDevicesState.audio.devices
            .filter(({ label }) => !label.startsWith("Default"))
            .map(({ deviceId, label }) => (
              <div key={deviceId} className="join-item w-full">
                <AudioDevicePanel
                  activeStreams={activeStreams}
                  key={deviceId}
                  deviceId={deviceId}
                  label={label}
                  setActiveAudioStreams={setActiveStreams}
                  setSelectedAudioId={setSelectedDeviceId}
                  selected={selectedDeviceId?.id === deviceId}
                  streamInfo={(activeStreams && activeStreams[deviceId]) || null}
                />
              </div>
            ))}

        <div className="grid gap-4 grid-flow-row grid-cols-5 grid-rows-2 max-w-full">
          {mockStreams?.map((stream) => (
            <button
              key={stream.id}
              className="join-item"
              onClick={() => {
                setSelectedDeviceId({ id: stream.id, type: "video" });
              }}
            >
              <CanvasTile
                key={stream.id}
                label={stream.id}
                selected={selectedDeviceId?.id === stream.id}
                streamInfo={stream}
              />
            </button>
          ))}
          {Object.entries(activeStreams || {}).map(([_, streamInfo]) => (
            <button
              key={streamInfo.id}
              className=" w-20"
              onClick={() => {
                setSelectedDeviceId({ id: streamInfo.id, type: "video" });
              }}
            >
              <DeviceTile
                key={streamInfo.id}
                selected={selectedDeviceId?.id === streamInfo.id}
                streamInfo={streamInfo}
              />
            </button>
          ))}
          {/* <button
            className="card-body  rounded-md p-4"
            onClick={() => {
              setSelectedDeviceId({ id: "mock-audio", type: "audio" });
            }}
          >
            <div className="flex flex-col w-20   bg-black  p-1.5   pl-3 indicator">
              {selectedDeviceId?.id === "mock-audio" && (
                <span className="indicator-item badge badge-success badge-lg"></span>
              )}
              <BsMusicNoteBeamed size={48} color="white" />
            </div>
          </button> */}
        </div>
      </div>
    </div>
  );
};
