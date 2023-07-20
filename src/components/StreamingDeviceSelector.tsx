import { useState } from 'react';
import { createStream } from '../utils/createMockStream';
import { VideoTile } from './VideoTile';
import { CanvasTile } from './CanvasTile';
import { enumerateDevices, EnumerateDevices } from '@jellyfish-dev/browser-media-utils';
import { AudioTile } from './AudioTile';
import { DeviceInfo } from '../containers/StreamingSettingsPanel';

export type StreamInfo = {
  stream: MediaStream;
  id: string;
};
export type DeviceIdToStream = Record<string, StreamInfo>;

type Props = {
  selectedDeviceId: DeviceInfo | null;
  setSelectedDeviceId: (cameraId: DeviceInfo | null) => void;
  activeStreams: DeviceIdToStream | null;
  setActiveStreams: (
    setter: ((prev: DeviceIdToStream | null) => DeviceIdToStream) | DeviceIdToStream | null,
  ) => void;
  // streamInfo: StreamInfo | null;
};

export const heartStream: StreamInfo = {
  stream: createStream('💜', 'black', 24).stream,
  id: 'HEART_STREAM',
};
export const frogStream: StreamInfo = {
  stream: createStream('🐸', 'black', 24).stream,
  id: 'FROG_STREAM',
};
export const elixirStream: StreamInfo = {
  stream: createStream('🧪', 'black', 24).stream,
  id: 'ELIXIR_STREAM',
};
export const octopusStream: StreamInfo = {
  stream: createStream('🐙', 'black', 24).stream,
  id: 'OCTOPUS_STREAM',
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
      {enumerateDevicesState?.video.type !== 'OK' && (
        <div className='m-2'>
          <button
            className='btn btn-sm btn-info mx-1 my-0 w-full'
            onClick={() => {
              enumerateDevices({}, {})
                .then((result) => {
                  console.log({ 'OK: ': result });
                  setEnumerateDevicesState(result);
                  console.log('inside: ' + enumerateDevicesState);
                })
                .catch((error) => {
                  console.log('Error caught ' + error);
                  setEnumerateDevicesState(error);
                });
            }}
          >
            List video devices
          </button>
        </div>
      )}

      <div className='flex flex-col place-content-center flex-wrap m-2 w-full'>
        {enumerateDevicesState?.video.type === 'OK' &&
          enumerateDevicesState.video.devices.map(({ deviceId, label }) => (
            <div
              key={deviceId}
              className='join-item hover:cursor-pointer'
              onClick={() => {
                setSelectedDeviceId({id: deviceId, type: 'video'});
              }}
            >
              <VideoTile
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

        {enumerateDevicesState?.audio.type === 'OK' &&
          enumerateDevicesState.audio.devices.map(({ deviceId, label }) => (
            <div
              key={deviceId}
              className='join-item hover:cursor-pointer'
              onClick={() => {
                setSelectedDeviceId({id: deviceId, type: 'audio'});
              }}
            >
              <AudioTile
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

        <div className='join '>
          {mockStreams?.map((stream) => (
            <div
              key={stream.id}
              className='join-item hover:cursor-pointer'
              onClick={() => {
                setSelectedDeviceId({id: stream.id, type: 'video'});
              }}
            >
              <CanvasTile
                key={stream.id}
                label={stream.id}
                selected={selectedDeviceId?.id === stream.id}
                streamInfo={stream}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};