import sys
sys.stdout.reconfigure(encoding="utf-8")

from hardcoded_rules import match_rule, detect_language
from router import classify
from persona import build_system_prompt

print("=== hardcoded_rules test cases ===")
cases = [
    ("hello",                                               "greeting EN"),
    ("Who are you?",                                        "identity EN"),
    ("mujhe batao ki server start kaise krte hain",         "MUST be None (LLM)"),
    ("mujhe Network WiFi connectivity mein problem aa rahi hai", "wifi OR None, NOT greeting"),
    ("namaste",                                             "greeting Hinglish"),
    ("account management",                                  "account menu button EN"),
    ("Technical support chahiye",                           "tech support Hinglish"),
    ("forgot password",                                     "account rule EN"),
]
for msg, label in cases:
    lang = detect_language(msg)
    result = match_rule(msg)
    short = (result[:70] + "...") if result and len(result) > 70 else result
    print(f"  [{label}]")
    print(f"    Input : {msg!r}")
    print(f"    Lang  : {lang}")
    print(f"    Reply : {short!r}")
    print()

print("=== router.classify test cases ===")
router_cases = [
    ("hello",                                                  "instant"),
    ("Who are you?",                                           "instant"),
    ("mujhe batao ki server start kaise krte hain",            "reason"),
    ("How do I configure nginx reverse proxy for FastAPI?",    "reason"),
    ("thanks",                                                 "instant"),
]
all_ok = True
for msg, expected in router_cases:
    got = classify(msg)
    ok = got == expected
    if not ok:
        all_ok = False
    status = "OK" if ok else "FAIL"
    print(f"  classify({msg!r}) -> {got!r} (expected {expected!r}) {status}")

print()
print("=== persona import ===")
p = build_system_prompt()
print(f"  build_system_prompt() chars: {len(p)}")
print(f"  CRITICAL LANGUAGE RULE present: {'CRITICAL LANGUAGE RULE' in p}")
p2 = build_system_prompt("casual")
print(f"  build_system_prompt('casual') works: {len(p2) > 0}")
print()
if all_ok:
    print("ALL CHECKS PASSED")
else:
    print("SOME CHECKS FAILED - see above")
