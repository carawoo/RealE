const KAKAO_API_BASE = "https://kapi.kakao.com";

export type KakaoUnlinkOptions =
  | { accessToken: string; targetId?: never; adminKey?: never }
  | { targetId: string; adminKey: string; accessToken?: never };

export async function unlinkKakaoUser(options: KakaoUnlinkOptions): Promise<boolean> {
  const url = `${KAKAO_API_BASE}/v1/user/unlink`;
  let headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
  };
  let body: URLSearchParams;

  if ("accessToken" in options) {
    headers.Authorization = `Bearer ${options.accessToken}`;
    body = new URLSearchParams();
  } else {
    headers.Authorization = `KakaoAK ${options.adminKey}`;
    body = new URLSearchParams({ target_id_type: "user_id", target_id: options.targetId });
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Kakao unlink failed (${response.status}): ${text || response.statusText}`);
  }

  return true;
}


