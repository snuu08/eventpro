const SCRIPT_ID = "kakao-maps-sdk";

let loadPromise: Promise<void> | null = null;

function isSdkReady(): boolean {
  return typeof window.kakao?.maps?.Map === "function";
}

export function loadKakaoSdk(appKey: string): Promise<void> {
  if (isSdkReady()) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      window.kakao.maps.load(() => resolve());
    };

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      if (window.kakao?.maps) {
        finish();
      } else {
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener(
          "error",
          () => {
            loadPromise = null;
            reject(new Error("Kakao Maps SDK failed to load"));
          },
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.onload = finish;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Kakao Maps SDK failed to load"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function getKakaoAppKey(): string | undefined {
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  return key ? key : undefined;
}
