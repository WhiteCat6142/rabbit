import { createEffect, onMount, type Component, onError } from 'solid-js';

import { useNavigate } from '@solidjs/router';

import Columns from '@/components/column/Columns';
import GlobalModal from '@/components/modal/GlobalModal';
import SideBar from '@/components/SideBar';
import useConfig from '@/core/useConfig';
import usePersistStatus from '@/hooks/usePersistStatus';
import { useMountShortcutKeys } from '@/hooks/useShortcutKeys';
import usePool from '@/nostr/usePool';
import usePubkey from '@/nostr/usePubkey';

const Home: Component = () => {
  useMountShortcutKeys();

  const navigate = useNavigate();
  const { persistStatus } = usePersistStatus();

  const pool = usePool();
  const { config, initializeColumns } = useConfig();
  const pubkey = usePubkey();

  createEffect(() => {
    config().relayUrls.map(async (relayUrl) => {
      try {
        const relay = await pool().ensureRelay(relayUrl);
        relay.onnotice = (msg: string) => {
          console.error(`NOTICE: ${relayUrl}: ${msg}`);
        };
        relay.onclose = () => {
          console.warn(`CLOSE: ${relayUrl}`);
        };
      } catch (err) {
        console.error('ensureRelay failed', err);
      }
    });
  });

  createEffect(() => {
    // pubkeyが得られてはじめてカラムを初期化できる
    const p = pubkey();
    if (p != null) {
      initializeColumns({ pubkey: p });
    }
  });

  onMount(() => {
    if (!persistStatus().loggedIn) {
      navigate('/hello');
    }
  });

  onError((err) => {
    console.error('uncaught error: ', err);
  });

  return (
    <div class="absolute inset-0 flex w-screen touch-manipulation flex-row overflow-hidden">
      <SideBar />
      <Columns />
      <GlobalModal />
    </div>
  );
};

export default Home;
