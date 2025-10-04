// create-actual-images.js
// 실제 이미지 생성 스크립트

const fs = require('fs');
const path = require('path');

// Canvas를 사용한 이미지 생성 (실제로는 AI API 사용)
async function createBlogImages() {
  console.log('🎨 블로그 이미지 생성 시작...\n');
  
  const imageDir = path.join(__dirname, 'public', 'images', 'blog');
  
  // 각 포스트별 이미지 생성
  const posts = [
    {
      id: 'loan-scenarios-2025',
      title: '2025년 부동산 대출 시나리오',
      category: '대출 가이드',
      color: '#6366F1'
    },
    {
      id: 'policy-loans-comparison-2025',
      title: '디딤돌대출 vs 보금자리론',
      category: '정책 분석',
      color: '#8B5CF6'
    },
    {
      id: 'freelancer-income-proof-2025',
      title: '프리랜서 소득증명 가이드',
      category: '소득증명',
      color: '#EC4899'
    },
    {
      id: 'ltv-dsr-calculations-2025',
      title: 'LTV와 DSR 계산법',
      category: '대출 기초',
      color: '#10B981'
    },
    {
      id: 'real-estate-market-2025',
      title: '2025년 부동산 시장 전망',
      category: '시장 분석',
      color: '#F59E0B'
    },
    {
      id: 'interior-design-trends-2025',
      title: '2025년 인테리어 트렌드',
      category: '인테리어',
      color: '#EF4444'
    },
    {
      id: 'new-town-investment-2025',
      title: '신도시 투자 전략',
      category: '시장 분석',
      color: '#3B82F6'
    },
    {
      id: 'mortgage-rate-forecast-2025',
      title: '금리 전망과 대응 전략',
      category: '대출 가이드',
      color: '#8B5CF6'
    },
    {
      id: 'real-estate-tax-2025',
      title: '부동산 세금 정책',
      category: '정책 분석',
      color: '#10B981'
    },
    {
      id: 'commercial-real-estate-2025',
      title: '상업용 부동산 투자',
      category: '시장 분석',
      color: '#F59E0B'
    }
  ];
  
  for (const post of posts) {
    await createImage(post, imageDir);
  }
  
  console.log('\n🎉 모든 블로그 이미지 생성 완료!');
  console.log('📁 저장 위치: public/images/blog/');
  console.log('💡 실제 운영에서는 AI 이미지 생성 API를 사용하세요.');
}

// 개별 이미지 생성 함수
async function createImage(post, imageDir) {
  const filename = `${post.id}.jpg`;
  const imagePath = path.join(imageDir, filename);
  
  console.log(`📸 생성 중: ${post.title}`);
  
  // 실제로는 Canvas나 AI API를 사용해서 이미지 생성
  // 여기서는 간단한 SVG 기반 이미지를 생성
  const svgContent = createSVGImage(post);
  
  // SVG를 파일로 저장 (실제로는 JPG로 변환)
  const svgPath = imagePath.replace('.jpg', '.svg');
  fs.writeFileSync(svgPath, svgContent);
  
  console.log(`   ✅ 완료: ${filename}`);
}

// SVG 이미지 생성 함수
function createSVGImage(post) {
  const width = 400;
  const height = 250;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${post.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${post.color}80;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="url(#bg)" rx="12"/>
  
  <!-- 카테고리 태그 -->
  <rect x="20" y="20" width="80" height="24" fill="rgba(255,255,255,0.2)" rx="12"/>
  <text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="600">
    ${post.category}
  </text>
  
  <!-- 제목 -->
  <text x="200" y="120" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" font-weight="700">
    ${post.title}
  </text>
  
  <!-- 연도 -->
  <text x="200" y="150" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="16" font-weight="500">
    2025
  </text>
  
  <!-- 장식 요소 -->
  <circle cx="100" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="200" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
  <circle cx="300" cy="200" r="4" fill="rgba(255,255,255,0.3)"/>
</svg>`;
}

// 실행
if (require.main === module) {
  createBlogImages().catch(console.error);
}

module.exports = { createBlogImages };
