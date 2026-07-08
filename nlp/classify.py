from groq import Groq
import psycopg2
import os, json, time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PROMPT_TEMPLATE = """
You are an EV charging station review analyst.
Classify the following review and return ONLY a JSON object. No explanation, no markdown.

Review: "{review_text}"

Return exactly this JSON format:
{{
  "sentiment": "positive" | "neutral" | "negative",
  "issues": [],   // array of any that apply: "broken", "slow", "wait", "great", "clean"
  "confidence": 0.0 to 1.0
}}
"""

def classify_review(text):
    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{
                "role": "user",
                "content": PROMPT_TEMPLATE.format(review_text=text[:500])
            }],
            max_tokens=100,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            raw = "\n".join(lines).strip()
        return json.loads(raw)
    except Exception as e:
        print(f"Classification error: {e}")
        return {"sentiment": "neutral", "issues": [], "confidence": 0.0}

def run_classification():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()

    cur.execute("""
        SELECT id, review_text FROM reviews
        WHERE sentiment IS NULL AND review_text IS NOT NULL
    """)
    reviews = cur.fetchall()
    print(f"Classifying {len(reviews)} unscored reviews...")

    for rev_id, text in reviews:
        result = classify_review(text)
        cur.execute("""
            UPDATE reviews
            SET sentiment = %s, issues = %s, confidence = %s
            WHERE id = %s
        """, (result["sentiment"], result["issues"], result["confidence"], rev_id))
        conn.commit()  # Commit immediately to preserve progress and allow real-time monitoring
        print(f"Classified review ID {rev_id} - Sentiment: {result['sentiment']}")
        time.sleep(2.0)   # stay within Groq free rate limits (30 RPM)

    cur.close()
    conn.close()
    print("Classification complete.")

def compute_reliability_scores():
    """
    Recency-weighted sentiment scoring per station.
    positive = 100 pts, neutral = 50 pts, negative = 0 pts.
    Last 30 days = weight 2.0, last 90 days = 1.5, older = 1.0.
    Divided by the sum of weights for a mathematically correct weighted average.
    """
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur  = conn.cursor()

    cur.execute("""
        UPDATE stations s
        SET reliability_score = sub.score
        FROM (
            SELECT
                st.id AS station_id,
                SUM(
                    CASE r.sentiment
                        WHEN 'positive' THEN 100
                        WHEN 'neutral'  THEN 50
                        ELSE 0
                    END
                    *
                    CASE
                        WHEN r.review_date >= NOW() - INTERVAL '30 days' THEN 2.0
                        WHEN r.review_date >= NOW() - INTERVAL '90 days' THEN 1.5
                        ELSE 1.0
                    END
                ) / NULLIF(SUM(
                    CASE
                        WHEN r.review_date >= NOW() - INTERVAL '30 days' THEN 2.0
                        WHEN r.review_date >= NOW() - INTERVAL '90 days' THEN 1.5
                        ELSE 1.0
                    END
                ), 0) AS score
            FROM stations st
            JOIN reviews r ON r.station_id = st.id OR (r.station_id IS NULL AND r.network_operator = st.network_operator)
            WHERE r.sentiment IS NOT NULL
            GROUP BY st.id
        ) sub
        WHERE s.id = sub.station_id;
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Reliability scores updated.")

if __name__ == "__main__":
    run_classification()
    compute_reliability_scores()
