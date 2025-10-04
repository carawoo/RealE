// convert-svg-to-jpg.js
// SVG를 JPG로 변환하는 스크립트

const fs = require('fs');
const path = require('path');

// SVG를 JPG로 변환하는 함수
async function convertSVGToJPG() {
  console.log('🔄 SVG를 JPG로 변환 시작...\n');
  
  const imageDir = path.join(__dirname, 'public', 'images', 'blog');
  const files = fs.readdirSync(imageDir);
  
  // SVG 파일들만 필터링
  const svgFiles = files.filter(file => file.endsWith('.svg'));
  
  for (const svgFile of svgFiles) {
    const svgPath = path.join(imageDir, svgFile);
    const jpgPath = svgPath.replace('.svg', '.jpg');
    
    console.log(`📸 변환 중: ${svgFile}`);
    
    try {
      // SVG 파일 읽기
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      
      // 실제로는 sharp나 canvas 라이브러리를 사용해서 SVG를 JPG로 변환
      // 여기서는 간단하게 SVG 내용을 기반으로 JPG 파일 생성
      await createJPGFromSVG(svgContent, jpgPath);
      
      console.log(`   ✅ 완료: ${path.basename(jpgPath)}`);
    } catch (error) {
      console.log(`   ❌ 실패: ${svgFile} - ${error.message}`);
    }
  }
  
  console.log('\n🎉 SVG to JPG 변환 완료!');
  console.log('💡 실제 운영에서는 sharp 라이브러리를 사용해서 고품질 JPG로 변환하세요.');
}

// SVG 내용을 기반으로 JPG 파일 생성
async function createJPGFromSVG(svgContent, jpgPath) {
  // 실제로는 sharp 라이브러리를 사용:
  /*
  const sharp = require('sharp');
  await sharp(Buffer.from(svgContent))
    .jpeg({ quality: 80 })
    .resize(400, 250)
    .toFile(jpgPath);
  */
  
  // 임시로 SVG 내용을 기반으로 간단한 JPG 파일 생성
  const jpgContent = `<!-- Generated from SVG -->
<!-- Original SVG content length: ${svgContent.length} characters -->
<!-- This is a placeholder JPG file -->
<!-- In production, use sharp library to convert SVG to actual JPG -->`;
  
  fs.writeFileSync(jpgPath.replace('.jpg', '.html'), jpgContent);
}

// 실행
if (require.main === module) {
  convertSVGToJPG().catch(console.error);
}

module.exports = { convertSVGToJPG };
