'use client';

import { useEffect, useRef, useState } from 'react';

interface Property {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  price?: number;
  areaSize?: number;
  type?: string;
  tradeType?: string;
}

interface KakaoMapProps {
  address: string;
  width?: string;
  height?: string;
  showProperties?: boolean; // 매물 표시 여부
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMap({ address, width = '100%', height = '300px', showProperties = true }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    console.log('[KakaoMap] Rendering map for address:', address);
    console.log('[KakaoMap] API Key:', process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ? 'present' : 'missing');
    console.log('[KakaoMap] Show properties:', showProperties);
    
    // 매물 검색
    const fetchProperties = async () => {
      if (!showProperties) return;
      
      try {
        const response = await fetch(`/api/properties?region=${encodeURIComponent(address)}`);
        if (response.ok) {
          const data = await response.json();
          setProperties(data.properties || []);
          console.log('[KakaoMap] Properties loaded:', data.properties?.length);
        }
      } catch (err) {
        console.error('[KakaoMap] Failed to fetch properties:', err);
      }
    };
    
    fetchProperties();
    
    const loadKakaoMap = () => {
      if (!window.kakao || !window.kakao.maps) {
        console.error('[KakaoMap] Kakao Maps SDK not loaded');
        setError('카카오맵 API를 불러올 수 없습니다.');
        return;
      }

      if (!mapContainer.current) {
        console.warn('[KakaoMap] Map container not found');
        return;
      }

      console.log('[KakaoMap] Geocoding address:', address);
      const geocoder = new window.kakao.maps.services.Geocoder();

      // 주소로 좌표 검색
      geocoder.addressSearch(address, (result: any, status: any) => {
        console.log('[KakaoMap] Geocoding result:', { result, status });
        
        if (status === window.kakao.maps.services.Status.OK) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          console.log('[KakaoMap] Coordinates found:', result[0].y, result[0].x);

          // 지도 생성
          const map = new window.kakao.maps.Map(mapContainer.current, {
            center: coords,
            level: showProperties ? 5 : 3, // 매물 표시 시 더 넓게
          });

          // 매물이 있으면 마커들 표시
          if (showProperties && properties.length > 0) {
            console.log('[KakaoMap] Adding property markers:', properties.length);
            
            properties.forEach((property) => {
              const markerPosition = new window.kakao.maps.LatLng(property.latitude, property.longitude);
              const marker = new window.kakao.maps.Marker({
                map: map,
                position: markerPosition,
              });

              // 클릭 시 매물 정보 표시
              const priceText = property.price 
                ? `${(property.price / 100000000).toFixed(1)}억원` 
                : '가격정보 없음';
              const areaText = property.areaSize 
                ? `${property.areaSize}평` 
                : '';
              
              const infoContent = `
                <div style="padding:10px;min-width:180px;">
                  <div style="font-weight:bold;margin-bottom:5px;">${property.name}</div>
                  <div style="font-size:12px;color:#666;margin-bottom:3px;">${property.address}</div>
                  <div style="font-size:13px;color:#007AFF;font-weight:bold;">${priceText} ${areaText}</div>
                </div>
              `;
              
              const infowindow = new window.kakao.maps.InfoWindow({
                content: infoContent,
              });

              window.kakao.maps.event.addListener(marker, 'click', () => {
                infowindow.open(map, marker);
              });
            });
            
            console.log('[KakaoMap] Property markers added successfully');
          } else {
            // 매물이 없으면 중심 마커만 표시
            const marker = new window.kakao.maps.Marker({
              map: map,
              position: coords,
            });

            const infowindow = new window.kakao.maps.InfoWindow({
              content: `<div style="padding:5px;font-size:12px;width:150px;text-align:center;">${address}</div>`,
            });
            infowindow.open(map, marker);
          }
          
          console.log('[KakaoMap] Map successfully rendered');
        } else {
          console.error('[KakaoMap] Geocoding failed, status:', status);
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
  }, [address, properties, showProperties]);

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

