import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ShieldCheck,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { createWorker } from "tesseract.js";

type VerificationStatus =
  | "processing"
  | "verified"
  | "rejected"
  | null;

const IdentityVerification: React.FC = () => {
  const [documentType, setDocumentType] =
    useState("Aadhaar Card");

  const [file, setFile] =
    useState<File | null>(null);

  const [status, setStatus] =
    useState<VerificationStatus>(null);

  const [message, setMessage] =
    useState("");

  const [ocrText, setOcrText] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [existingLoading, setExistingLoading] =
    useState(true);

  // --------------------------------------------------
  // LOAD EXISTING VERIFICATION
  // --------------------------------------------------

  useEffect(() => {
    loadExistingVerification();
  }, []);

  const loadExistingVerification = async () => {
    try {
      setExistingLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("AUTH ERROR:", authError);
        setExistingLoading(false);
        return;
      }

      if (!user) {
        setExistingLoading(false);
        return;
      }

      console.log(
        "CURRENT LOGGED-IN USER:",
        user.id
      );

      // --------------------------------------------------
      // CHECK PROFILE
      // --------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, is_verified")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "PROFILE VERIFICATION STATUS ERROR:",
          profileError
        );
      }

      // --------------------------------------------------
      // IF THIS USER IS ALREADY VERIFIED
      // --------------------------------------------------

      if (profile?.is_verified === true) {
        setStatus("verified");

        setMessage(
          "Your identity has already been verified."
        );

        return;
      }

      // --------------------------------------------------
      // CHECK IDENTITY VERIFICATION TABLE
      // ONLY FOR CURRENT USER
      // --------------------------------------------------

      const {
        data: verification,
        error: verificationError,
      } = await supabase
        .from("identity_verifications")
        .select(
          "id, user_id, status, rejection_reason, verification_notes, submitted_at, verified_at"
        )
        .eq("user_id", user.id)
        .order("submitted_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (verificationError) {
        console.error(
          "VERIFICATION STATUS ERROR:",
          verificationError
        );

        return;
      }

      // --------------------------------------------------
      // IMPORTANT:
      // VERIFY THAT RECORD BELONGS TO CURRENT USER
      // --------------------------------------------------

      if (
        verification?.user_id === user.id &&
        verification?.status === "verified"
      ) {
        console.log(
          "VERIFIED DOCUMENT FOUND FOR CURRENT USER:",
          user.id
        );

        // --------------------------------------------------
        // SYNC PROFILE BADGE
        // --------------------------------------------------

        const {
          error: updateError,
        } = await supabase
          .from("profiles")
          .update({
            is_verified: true,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error(
            "PROFILE BADGE SYNC ERROR:",
            updateError
          );

          return;
        }

        setStatus("verified");

        setMessage(
          "Your identity has already been verified."
        );
      }
    } catch (error) {
      console.error(
        "LOAD VERIFICATION ERROR:",
        error
      );
    } finally {
      setExistingLoading(false);
    }
  };

  // --------------------------------------------------
  // FILE SELECT
  // --------------------------------------------------

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      e.target.files?.[0] || null;

    setFile(selectedFile);
    setMessage("");
    setOcrText("");
    setStatus(null);
  };

  // --------------------------------------------------
  // OCR
  // --------------------------------------------------

  const runOCR = async (
    selectedFile: File
  ) => {
    console.log("OCR STARTED");

    let worker: any = null;

    try {
      worker = await createWorker("eng");

      console.log(
        "TESSERACT WORKER READY"
      );

      const ocrPromise =
        worker.recognize(selectedFile);

      const timeoutPromise =
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "OCR is taking too long. Please upload a clearer JPG or PNG image."
              )
            );
          }, 30000);
        });

      const result: any =
        await Promise.race([
          ocrPromise,
          timeoutPromise,
        ]);

      const text =
        result?.data?.text || "";

      console.log(
        "OCR COMPLETED"
      );

      console.log(
        "OCR TEXT:",
        text
      );

      return text;
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.error(
            "WORKER TERMINATION ERROR:",
            error
          );
        }
      }

      console.log(
        "OCR WORKER CLOSED"
      );
    }
  };

  // --------------------------------------------------
  // VERIFY OCR TEXT
  // --------------------------------------------------

  const verifyDocument = (
    text: string
  ) => {
    const normalized = text
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const lowerText =
      normalized.toLowerCase();

    const upperText =
      normalized.toUpperCase();

    console.log(
      "NORMALIZED OCR:",
      normalized
    );

    // --------------------------------------------------
    // NAME
    // --------------------------------------------------

    const hasName =
      lowerText.includes("name") ||
      lowerText.includes("नाम") ||
      lowerText.includes("father") ||
      lowerText.includes("s/o") ||
      lowerText.includes("d/o") ||
      lowerText.includes("son of") ||
      lowerText.includes("daughter of");

    // --------------------------------------------------
    // DOB
    // --------------------------------------------------

    const hasDob =
      lowerText.includes("dob") ||
      lowerText.includes("date of birth") ||
      lowerText.includes("birth") ||
      lowerText.includes("जन्म");

    // --------------------------------------------------
    // AADHAAR
    // --------------------------------------------------

    const hasAadhaar =
      /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(
        normalized
      );

    // --------------------------------------------------
    // PAN
    // --------------------------------------------------

    const hasPan =
      /\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(
        upperText
      );

    // --------------------------------------------------
    // DRIVING LICENCE
    // --------------------------------------------------

    const hasDrivingLicence =
      /\b[A-Z]{2}[- ]?[0-9]{4,15}\b/.test(
        upperText
      );

    // --------------------------------------------------
    // DOCUMENT TYPE
    // --------------------------------------------------

    const type =
      documentType.toLowerCase();

    let documentNumberFound =
      false;

    if (
      type.includes("aadhaar")
    ) {
      documentNumberFound =
        hasAadhaar;
    } else if (
      type.includes("pan")
    ) {
      documentNumberFound =
        hasPan;
    } else if (
      type.includes("driving") ||
      type.includes("licence") ||
      type.includes("license")
    ) {
      documentNumberFound =
        hasDrivingLicence;
    } else {
      documentNumberFound =
        hasAadhaar ||
        hasPan ||
        hasDrivingLicence;
    }

    // --------------------------------------------------
    // CHECKS
    // --------------------------------------------------

    const checks = {
      name: hasName,
      dob: hasDob,
      document: documentNumberFound,
    };

    const passedChecks =
      Object.values(checks).filter(
        Boolean
      ).length;

    console.log(
      "DOCUMENT CHECKS:",
      {
        ...checks,
        passedChecks,
      }
    );

    // --------------------------------------------------
    // 2 OUT OF 3 = VERIFIED
    // --------------------------------------------------

    if (passedChecks >= 2) {
      return {
        status: "verified" as const,

        score: Math.round(
          (passedChecks / 3) * 100
        ),

        checks,
      };
    }

    return {
      status: "rejected" as const,

      score: Math.round(
        (passedChecks / 3) * 100
      ),

      checks,
    };
  };

  // --------------------------------------------------
  // SUBMIT VERIFICATION
  // --------------------------------------------------

  const submitVerification =
    async () => {
      console.log(
        "VERIFY BUTTON CLICKED"
      );

      if (!file) {
        setMessage(
          "Please select an identity document."
        );
        return;
      }

      // --------------------------------------------------
      // FILE SIZE
      // --------------------------------------------------

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setMessage(
          "File size must be less than 5 MB."
        );
        return;
      }

      // --------------------------------------------------
      // FILE TYPE
      // --------------------------------------------------

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setStatus("rejected");

        setMessage(
          "Please upload a JPG or PNG image. PDF is not supported for automatic OCR."
        );

        return;
      }

      try {
        setLoading(true);

        setStatus("processing");

        setMessage(
          "Reading your document... Please wait."
        );

        setOcrText("");

        // --------------------------------------------------
        // GET CURRENT AUTH USER
        // --------------------------------------------------

        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (
          userError ||
          !user
        ) {
          throw new Error(
            "Please login again."
          );
        }

        // THIS IS THE ONLY USER WHO WILL BE VERIFIED
        const currentUserId =
          user.id;

        console.log(
          "CURRENT USER ID:",
          currentUserId
        );

        // --------------------------------------------------
        // OCR
        // --------------------------------------------------

        const extractedText =
          await runOCR(file);

        setOcrText(
          extractedText
        );

        if (
          !extractedText.trim()
        ) {
          setStatus(
            "rejected"
          );

          setMessage(
            "No readable text was detected. Please upload a clearer image."
          );

          return;
        }

        // --------------------------------------------------
        // CHECK DOCUMENT
        // --------------------------------------------------

        const result =
          verifyDocument(
            extractedText
          );

        console.log(
          "FINAL VERIFICATION:",
          result
        );

        // --------------------------------------------------
        // UPLOAD DOCUMENT
        // --------------------------------------------------

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase() ||
          "jpg";

        const filePath =
          `${currentUserId}/identity-${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              "identity-documents"
            )
            .upload(
              filePath,
              file,
              {
                upsert: false,
                contentType:
                  file.type,
              }
            );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        console.log(
          "DOCUMENT UPLOADED:",
          filePath
        );

        // --------------------------------------------------
        // SAVE VERIFICATION RESULT
        // --------------------------------------------------

        const {
          error: insertError,
        } =
          await supabase
            .from(
              "identity_verifications"
            )
            .insert({
              user_id:
                currentUserId,

              document_type:
                documentType,

              document_url:
                filePath,

              status:
                result.status,

              verification_score:
                result.score,

              verification_notes:
                result.status ===
                "verified"
                  ? "Automatic OCR verification completed successfully."
                  : "Required identity information could not be detected.",

              submitted_at:
                new Date().toISOString(),

              verified_at:
                result.status ===
                "verified"
                  ? new Date().toISOString()
                  : null,
            });

        if (insertError) {
          throw new Error(
            insertError.message
          );
        }

        console.log(
          "VERIFICATION SAVED:",
          result.status
        );

        // ==================================================
        // VERIFIED
        // ==================================================

        if (
          result.status ===
          "verified"
        ) {
          console.log(
            "ACTIVATING BADGE FOR USER:",
            currentUserId
          );

          // IMPORTANT:
          // ONLY THE CURRENT LOGGED-IN USER
          // GETS is_verified = true
          const {
            data: updatedProfile,
            error:
              profileUpdateError,
          } =
            await supabase
              .from("profiles")
              .update({
                is_verified:
                  true,
              })
              .eq(
                "id",
                currentUserId
              )
              .select(
                "id, full_name, is_verified"
              )
              .single();

          if (
            profileUpdateError
          ) {
            console.error(
              "PROFILE VERIFICATION UPDATE ERROR:",
              profileUpdateError
            );

            throw new Error(
              "Identity verified, but the verified badge could not be activated."
            );
          }

          console.log(
            "PROFILE UPDATED:",
            updatedProfile
          );

          // --------------------------------------------------
          // SAFETY CHECK
          // --------------------------------------------------

          if (
            updatedProfile?.id !==
            currentUserId
          ) {
            throw new Error(
              "Verification profile mismatch."
            );
          }

          if (
            updatedProfile?.is_verified !==
            true
          ) {
            throw new Error(
              "Verified badge could not be confirmed."
            );
          }

          setStatus(
            "verified"
          );

          setMessage(
            "Identity verified successfully! Your verified badge is now active."
          );
        } else {
          // ==================================================
          // REJECTED
          // ==================================================

          setStatus(
            "rejected"
          );

          setMessage(
            "The document could not be verified. Please upload a clearer image."
          );
        }
      } catch (error) {
        console.error(
          "IDENTITY VERIFICATION ERROR:",
          error
        );

        setStatus(null);

        setMessage(
          error instanceof Error
            ? error.message
            : "Identity verification failed."
        );
      } finally {
        setLoading(false);
      }
    };

  // --------------------------------------------------
  // LOADING EXISTING STATUS
  // --------------------------------------------------

  if (existingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2
          className="animate-spin"
          size={30}
        />
      </div>
    );
  }

  // --------------------------------------------------
  // VERIFIED SCREEN
  // --------------------------------------------------

  if (
    status === "verified"
  ) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8 text-center">

          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldCheck
              className="text-emerald-600"
              size={34}
            />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mt-5">
            Identity Verified
          </h1>

          <p className="text-stone-600 mt-2">
            Your identity document has been successfully verified.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle
              size={20}
            />

            Verified
          </div>

        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-stone-50 p-6">

      <div className="max-w-xl mx-auto">

        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">

          {/* HEADER */}

          <div className="flex items-center gap-3 mb-6">

            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck
                className="text-emerald-600"
                size={26}
              />
            </div>

            <div>

              <h1 className="text-2xl font-bold text-stone-900">
                Verify Identity
              </h1>

              <p className="text-sm text-stone-500">
                Upload a valid identity document
              </p>

            </div>

          </div>

          {/* DOCUMENT TYPE */}

          <div className="mb-5">

            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Document Type
            </label>

            <select
              value={
                documentType
              }
              onChange={(e) =>
                setDocumentType(
                  e.target.value
                )
              }
              disabled={
                loading
              }
              className="w-full border border-stone-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >

              <option>
                Aadhaar Card
              </option>

              <option>
                PAN Card
              </option>

              <option>
                Driving Licence
              </option>

              <option>
                Other Government ID
              </option>

            </select>

          </div>

          {/* FILE UPLOAD */}

          <label className="block cursor-pointer">

            <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center hover:border-emerald-500 transition">

              <Upload
                className="mx-auto text-stone-400 mb-3"
                size={30}
              />

              <p className="font-semibold text-stone-700">
                {file
                  ? file.name
                  : "Choose identity document"}
              </p>

              <p className="text-sm text-stone-500 mt-1">
                JPG or PNG • Maximum 5 MB
              </p>

            </div>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={
                handleFileChange
              }
              className="hidden"
              disabled={
                loading
              }
            />

          </label>

          {/* BUTTON */}

          <button
            onClick={
              submitVerification
            }
            disabled={
              loading ||
              !file
            }
            className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition"
          >

            {loading ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={20}
                />

                Checking Document...
              </>
            ) : (
              <>
                <ShieldCheck
                  size={20}
                />

                Verify Identity
              </>
            )}

          </button>

          {/* MESSAGE */}

          {message && (
            <div
              className={`mt-5 rounded-xl p-4 text-sm ${
                status ===
                "rejected"
                  ? "bg-red-50 text-red-700"
                  : status ===
                    "processing"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* REJECTED */}

          {status ===
            "rejected" && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">

              <XCircle
                size={18}
              />

              Please upload a clear JPG or PNG image.

            </div>
          )}

          {/* OCR RESULT */}

          {ocrText && (
            <details className="mt-5">

              <summary className="cursor-pointer text-sm font-semibold text-stone-600">
                OCR result
              </summary>

              <pre className="mt-2 bg-stone-100 rounded-xl p-4 text-xs whitespace-pre-wrap max-h-60 overflow-auto">
                {ocrText}
              </pre>

            </details>
          )}

        </div>

      </div>

    </div>
  );
};

export default IdentityVerification;