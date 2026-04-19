import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication ---
    // --- Input Validation ---
    const body = await req.json();
    const { messages, challengeId, lang, guest } = body;

    // --- Authentication (optional for guest mode) ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const isGuest = guest === true;

    if (!isGuest) {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Guest mode: limit messages to 3 user messages max
    if (isGuest) {
      const userMsgCount = messages.filter((m: { role?: string }) => m.role === "user").length;
      if (userMsgCount > 3) {
        return new Response(JSON.stringify({ error: "guest_limit_exceeded" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return new Response(JSON.stringify({ error: "invalid_messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = new Set(["user", "assistant"]);
    const sanitizedMessages = messages.slice(-30).map((m: { role?: string; content?: string }) => ({
      role: allowedRoles.has(m.role ?? "") ? m.role : "user",
      content: String(m.content ?? "").slice(0, 3000),
    }));

    const validChallengeIds = ["pornography", "masturbation", "smoking", "drugs", "harassment", "notPraying"];
    const safeChallenge = validChallengeIds.includes(challengeId) ? challengeId : "general";
    const safeLang = lang === "ar" ? "ar" : "en";

    // --- Build prompt ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const challengeNames: Record<string, { ar: string; en: string }> = {
      pornography: { ar: "الإباحية", en: "Pornography" },
      masturbation: { ar: "العادة السرية", en: "Masturbation" },
      smoking: { ar: "التدخين", en: "Smoking" },
      drugs: { ar: "المخدرات", en: "Drugs" },
      harassment: { ar: "التحرش", en: "Harassment" },
      notPraying: { ar: "ترك الصلاة", en: "Not Praying" },
      general: { ar: "عادة سلبية", en: "negative habit" },
    };

    const challenge = challengeNames[safeChallenge] || challengeNames.general;
    const isArabic = safeLang === "ar";

    const systemPrompt = isArabic
      ? `أنت 'مرشد صراط'، مستشار تربوي ونفسي افتراضي متخصص في مساعدة الشباب والمراهقين على التغلب على ${challenge.ar}.

نبرتك: رحيمة، داعمة، غير حاكمة.

مهمتك: تحويل الرغبة في التغيير إلى خطوات إجرائية قابلة للقياس (قاعدة 5 دقائق، تحدي 7 أيام).

الخطوط الحمراء:
- عند استشعار خطر (انتحار/أذى مباشر)، توقف عن الوعظ. فعّل 'بروتوكول SOS الفوري': "أشعر بقلقك الشديد وأهم شيء الآن هو سلامتك. هل أنت الآن في مكان آمن؟" ثم وجهه لزر SOS في التطبيق أو للاتصال بخط الطوارئ المحلي.
- عند اعتراف بتحرش، فعّل 'مسار تحمل المسؤولية والاعتذار': "أشكرك على صدقك. هذا موضوع جدي. أول خطوة هي التوقف فوراً عن أي سلوك مؤذي." ثم اقترح خطوات إصلاحية.
- لا تشخص طبياً ولا تصف دواءً. لا تقدم وعوداً طبية.
- ذكّر المستخدم دائماً بخصوصية بياناته وحدود مسؤوليتك.

قواعد إضافية:
- قدم نصائح عملية وخطوات واضحة وقابلة للقياس
- استخدم التحفيز الإيجابي والتشجيع
- اذكر أن التغيير يحتاج صبراً وأن كل يوم هو فرصة جديدة
- لا تطلب معلومات شخصية حساسة
- أجب بالعربية دائماً
- استخدم الإيموجي بشكل معتدل للتحفيز`
      : `You are 'Sirat Guide', a virtual educational and psychological counselor specialized in helping youth and teenagers overcome ${challenge.en}.

Your tone: compassionate, supportive, non-judgmental.

Your mission: Transform the desire to change into measurable, actionable steps (5-minute rule, 7-day challenge).

Red Lines:
- When sensing danger (suicide/direct harm), stop preaching. Activate 'Immediate SOS Protocol': "I sense your deep concern and the most important thing now is your safety. Are you in a safe place right now?" Then direct them to the SOS button in the app or local emergency services.
- When someone admits to harassment, activate 'Accountability & Apology Path': "Thank you for your honesty. This is a serious matter. The first step is to immediately stop any harmful behavior." Then suggest restorative steps.
- Never diagnose medically or prescribe medication. Never make medical promises.
- Always remind users about their data privacy and the limits of your responsibility.

Additional rules:
- Provide practical advice and clear, measurable action steps
- Use positive motivation and encouragement
- Mention that change takes patience and every day is a new opportunity
- Never ask for sensitive personal information
- Always respond in English
- Use emojis moderately for motivation`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...sanitizedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
