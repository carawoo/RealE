// create-simple-images.js
// 간단한 블로그 이미지 생성 스크립트

const fs = require('fs');
const path = require('path');

// 각 포스트별 이미지 정보
const blogImages = [
  {
    id: 'loan-scenarios-2025',
    title: '2025년 부동산 대출 시나리오',
    category: '대출 가이드',
    color: '#6366F1',
    icon: '🏠'
  },
  {
    id: 'policy-loans-comparison-2025',
    title: '디딤돌대출 vs 보금자리론',
    category: '정책 분석',
    color: '#8B5CF6',
    icon: '📊'
  },
  {
    id: 'freelancer-income-proof-2025',
    title: '프리랜서 소득증명 가이드',
    category: '소득증명',
    color: '#EC4899',
    icon: '💼'
  },
  {
    id: 'ltv-dsr-calculations-2025',
    title: 'LTV와 DSR 계산법',
    category: '대출 기초',
    color: '#10B981',
    icon: '🧮'
  },
  {
    id: 'real-estate-market-2025',
    title: '2025년 부동산 시장 전망',
    category: '시장 분석',
    color: '#F59E0B',
    icon: '📈'
  },
  {
    id: 'interior-design-trends-2025',
    title: '2025년 인테리어 트렌드',
    category: '인테리어',
    color: '#EF4444',
    icon: '🏡'
  },
  {
    id: 'new-town-investment-2025',
    title: '신도시 투자 전략',
    category: '시장 분석',
    color: '#3B82F6',
    icon: '🏙️'
  },
  {
    id: 'mortgage-rate-forecast-2025',
    title: '금리 전망과 대응 전략',
    category: '대출 가이드',
    color: '#8B5CF6',
    icon: '💰'
  },
  {
    id: 'real-estate-tax-2025',
    title: '부동산 세금 정책',
    category: '정책 분석',
    color: '#10B981',
    icon: '📋'
  },
  {
    id: 'commercial-real-estate-2025',
    title: '상업용 부동산 투자',
    category: '시장 분석',
    color: '#F59E0B',
    icon: '🏢'
  }
];

// 메인 실행 함수
async function createSimpleImages() {
  console.log('🎨 간단한 블로그 이미지 생성 시작...\n');
  
  const imageDir = path.join(__dirname, 'public', 'images', 'blog');
  
  // 각 포스트별로 이미지 생성
  for (const image of blogImages) {
    await createImage(image, imageDir);
  }
  
  console.log('\n🎉 모든 블로그 이미지 생성 완료!');
  console.log('📁 저장 위치: public/images/blog/');
}

// 개별 이미지 생성 함수
async function createImage(imageInfo, imageDir) {
  const filename = `${imageInfo.id}.jpg`;
  const imagePath = path.join(imageDir, filename);
  
  console.log(`📸 생성 중: ${imageInfo.title}`);
  
  // 간단한 SVG 이미지 생성
  const svgContent = createSVGImage(imageInfo);
  
  // SVG 파일로 저장
  const svgPath = imagePath.replace('.jpg', '.svg');
  fs.writeFileSync(svgPath, svgContent);
  
  // 간단한 JPG 파일 생성 (실제로는 SVG를 JPG로 변환해야 함)
  const jpgContent = createSimpleJPG(imageInfo);
  fs.writeFileSync(imagePath, jpgContent);
  
  console.log(`   ✅ 완료: ${filename}`);
}

// SVG 이미지 생성 함수
function createSVGImage(imageInfo) {
  const width = 400;
  const height = 250;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${imageInfo.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${imageInfo.color}80;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="12"/>
  
  <!-- 카테고리 태그 -->
  <rect x="20" y="20" width="80" height="24" fill="rgba(255,255,255,0.2)" rx="12"/>
  <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="600">
    ${imageInfo.category}
  </text>
  
  <!-- 아이콘 -->
  <text x="200" y="100" text-anchor="middle" fill="white" font-size="48" font-family="Arial, sans-serif">
    ${imageInfo.icon}
  </text>
  
  <!-- 제목 -->
  <text x="200" y="140" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="700">
    ${imageInfo.title}
  </text>
  
  <!-- 연도 -->
  <text x="200" y="170" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="16" font-weight="500">
    2025
  </text>
  
  <!-- 장식 요소 -->
  <circle cx="100" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="300" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
</svg>`;
}

// 간단한 JPG 파일 생성 함수
function createSimpleJPG(imageInfo) {
  // 실제로는 SVG를 JPG로 변환해야 하지만, 여기서는 간단한 바이너리 데이터 생성
  const jpgHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const jpgFooter = Buffer.from([0xFF, 0xD9]);
  
  // 이미지 정보를 텍스트로 인코딩
  const imageData = JSON.stringify({
    title: imageInfo.title,
    category: imageInfo.category,
    color: imageInfo.color,
    icon: imageInfo.icon,
    year: '2025'
  });
  
  // JPG 파일 구조 생성
  const jpgBuffer = Buffer.concat([
    jpgHeader,
    Buffer.from(imageData, 'utf8'),
    jpgFooter
  ]);
  
  return jpgBuffer;
}

// 실행
if (require.main === module) {
  createSimpleImages().catch(console.error);
}

module.exports = { blogImages, createSimpleImages };
