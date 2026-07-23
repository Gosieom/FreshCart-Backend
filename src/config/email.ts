import nodemailer from "nodemailer";
import {
  EMAIL_PASS,
  EMAIL_USER,
} from "./index";

const password = String(
  process.env.EMAIL_PASSWORD ||
    EMAIL_PASS ||
    ""
).replace(/\s+/g, "");

export const transporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: password,
    },
  });

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  const mailOptions = {
    from:
      process.env.EMAIL_FROM ||
      `FreshCart <${EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
};
