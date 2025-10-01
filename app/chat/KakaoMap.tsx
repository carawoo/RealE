'use client';

import { useEffect, useRef, useState } from 'react';

interface KakaoMapProps {
  address: string;
  width?: string;
  height?: string;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ address, width = '100%', height = '300px' }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadKakaoMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        setError('카카오맵 API를 불러올 수 없습니다.');
        return;
      }

      if (!mapContainer.current) return;

      const geocoder = new window.kakao.maps.services.Geocoder();

      // 주소로 좌표 검색
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);

          // 지도 생성
          const map = new window.kakao.maps.Map(mapContainer.current, {
            center: coords,
            level: 3, // 확대 레벨
          });

          // 마커 표시
          const marker = new window.kakao.maps.Marker({
            map: map,
            position: coords,
          });

          // 인포윈도우 표시
          const infowindow = new window.kakao.maps.InfoWindow({
            content: `<div style="padding:5px;font-size:12px;width:150px;text-align:center;">${address}</div>`,
          });
          infowindow.open(map, marker);
        } else {
          setError('주소를 찾을 수 없습니다.');
        }
      });
    };

    // 카카오맵 스크립트가 이미 로드되어 있는지 확인
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(loadKakaoMap);
    } else {
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '';
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
      script.async = true;
      script.onload = () => {
        window.kakao.maps.load(loadKakaoMap);
      };
      document.head.appendChild(script);
    }
  }, [address]);

  if (error) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        color: '#666'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width, 
        height,
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }} 
    />
  );
}

