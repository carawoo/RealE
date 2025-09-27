import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  SMTP_FROM,
  SMTP_TO,
} = process.env;

const NUMBER_PORT = SMTP_PORT ? Number(SMTP_PORT) : 587;
const BOOLEAN_SECURE = SMTP_SECURE ? SMTP_SECURE === "true" : NUMBER_PORT === 465;

function ensureEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

export async function testMailgunConnection() {
  ensureEnv("SMTP_HOST", SMTP_HOST);
  ensureEnv("SMTP_USER", SMTP_USER);
  ensureEnv("SMTP_PASS", SMTP_PASS);
  ensureEnv("SMTP_FROM", SMTP_FROM);
  ensureEnv("SMTP_TO", SMTP_TO);

  console.log("[mail] SMTP host:", SMTP_HOST);
  console.log("[mail] SMTP port:", NUMBER_PORT);
  console.log("[mail] SMTP secure:", BOOLEAN_SECURE);
  console.log("[mail] SMTP user:", SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: NUMBER_PORT,
    secure: BOOLEAN_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.verify();
  console.log("[mail] SMTP verify OK");

  await transporter.sendMail({
    from: SMTP_FROM,
    to: SMTP_TO,
    subject: "RealE SMTP 테스트",
    text: "SMTP 환경변수 인증 테스트입니다.",
  });

  console.log(`Successfully sent test email to ${SMTP_TO}`);
}


