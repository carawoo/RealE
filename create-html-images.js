// create-html-images.js
// HTML 기반 블로그 이미지 생성 스크립트

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
async function createHTMLImages() {
  console.log('🎨 HTML 기반 블로그 이미지 생성 시작...\n');
  
  const imageDir = path.join(__dirname, 'public', 'images', 'blog');
  
  // 각 포스트별로 이미지 생성
  for (const image of blogImages) {
    await createImage(image, imageDir);
  }
  
  console.log('\n🎉 모든 블로그 이미지 생성 완료!');
  console.log('📁 저장 위치: public/images/blog/');
  console.log('💡 브라우저에서 HTML 파일을 열어서 스크린샷을 찍어 JPG로 변환하세요.');
}

// 개별 이미지 생성 함수
async function createImage(imageInfo, imageDir) {
  const filename = `${imageInfo.id}.html`;
  const imagePath = path.join(imageDir, filename);
  
  console.log(`📸 생성 중: ${imageInfo.title}`);
  
  // HTML 이미지 생성
  const htmlContent = createHTMLImage(imageInfo);
  
  // HTML 파일로 저장
  fs.writeFileSync(imagePath, htmlContent);
  
  console.log(`   ✅ 완료: ${filename}`);
}

// HTML 이미지 생성 함수
function createHTMLImage(imageInfo) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${imageInfo.title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, ${imageInfo.color}, ${imageInfo.color}80);
            width: 400px;
            height: 250px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }
        .category {
            background: rgba(255,255,255,0.2);
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .title {
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 10px;
            line-height: 1.3;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .year {
            font-size: 16px;
            font-weight: 500;
            opacity: 0.8;
        }
        .decoration {
            position: absolute;
            bottom: 20px;
            display: flex;
            gap: 20px;
        }
        .dot {
            width: 8px;
            height: 8px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
        }
    </style>
</head>
<body>
    <div class="category">${imageInfo.category}</div>
    <div class="icon">${imageInfo.icon}</div>
    <div class="title">${imageInfo.title}</div>
    <div class="year">2025</div>
    <div class="decoration">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    </div>
</body>
</html>`;
}

// 실행
if (require.main === module) {
  createHTMLImages().catch(console.error);
}

module.exports = { blogImages, createHTMLImages };
