from datetime import timedelta

from notifier import build_email, build_telegram_text


def plain_body(msg):
    return msg.get_body(preferencelist=("plain",)).get_content()


def html_body(msg):
    return msg.get_body(preferencelist=("html",)).get_content()


def test_build_email_down(make_event):
    msg = build_email(make_event(), "advenoh@gmail.com", ["a@x.com", "b@x.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F534 DOWN: Moneyflow"
    assert msg["From"] == "advenoh@gmail.com"
    assert msg["To"] == "a@x.com, b@x.com"
    body = plain_body(msg)
    assert "상태: DOWN (ERROR 2회 연속)" in body
    assert "HTTP Status: 502" in body
    assert "Message: Bad Gateway" in body
    assert "시각: 2026-10-02 14:37:12 KST" in body
    assert "다운 시작" not in body
    assert "대시보드: https://status.advenoh.pe.kr" in body


def test_build_email_recovered_has_duration(make_event, now):
    event = make_event(
        kind="RECOVERED",
        http_status=200,
        message=None,
        down_since=now - timedelta(minutes=32),
    )
    msg = build_email(event, "advenoh@gmail.com", ["advenoh@gmail.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F7E2 RECOVERED: Moneyflow (약 32분 다운)"
    body = plain_body(msg)
    assert "상태: RECOVERED" in body
    assert "다운 시작: 2026-10-02 14:05 KST" in body
    assert "Message: -" in body


def test_build_email_recovered_without_down_since(make_event):
    msg = build_email(make_event(kind="RECOVERED"), "a@x.com", ["a@x.com"])
    assert msg["Subject"] == "[advenoh-status] \U0001F7E2 RECOVERED: Moneyflow"
    assert "다운 시작" not in plain_body(msg)


def test_build_email_missing_http_status(make_event):
    msg = build_email(make_event(http_status=None), "a@x.com", ["a@x.com"])
    assert "HTTP Status: N/A" in plain_body(msg)


def test_build_telegram_text_escapes_markdown(make_event):
    text = build_telegram_text(make_event())
    assert "*\U0001F534 DOWN: Moneyflow*" in text
    assert r"https://moneyflow\.advenoh\.pe\.kr" in text
    assert r"2026\-10\-02 14:37:12 KST" in text
    assert r"\(ERROR 2회 연속\)" in text


def test_build_telegram_text_escapes_all_special_chars(make_event):
    special = "_*[]()~`>#+-=|{}.!\\"
    escaped = "".join("\\" + ch for ch in special)
    text = build_telegram_text(make_event(service_name=f"svc{special}", message=special))
    assert f"svc{escaped}" in text
    assert f"*Message:* {escaped}" in text


def test_build_email_is_multipart_with_html(make_event):
    msg = build_email(make_event(), "a@x.com", ["a@x.com"])
    assert msg.get_content_type() == "multipart/alternative"
    body = html_body(msg)
    assert "\U0001F534 DOWN" in body
    assert "#dc2626" in body
    assert "ERROR 2회 연속" in body
    assert "1,234 ms" in body
    assert "2026-10-02 14:37:12 KST" in body
    assert 'href="https://status.advenoh.pe.kr"' in body
    assert "다운 시작" not in body


def test_build_email_html_escapes_dynamic_values(make_event):
    msg = build_email(make_event(service_name="<b>svc</b>", message="<script>x</script> & y"), "a@x.com", ["a@x.com"])
    body = html_body(msg)
    assert "<script>" not in body and "<b>svc</b>" not in body
    assert "&lt;script&gt;x&lt;/script&gt; &amp; y" in body
    assert "&lt;b&gt;svc&lt;/b&gt;" in body


def test_build_email_html_recovered(make_event, now):
    event = make_event(kind="RECOVERED", http_status=200, message=None, down_since=now - timedelta(minutes=32))
    body = html_body(build_email(event, "a@x.com", ["a@x.com"]))
    assert "\U0001F7E2 RECOVERED" in body
    assert "#16a34a" in body
    assert "약 32분 만에 복구" in body
    assert "다운 시작" in body and "2026-10-02 14:05 KST" in body
    assert "Message</div>" not in body   # 메시지 없으면 상자 생략


def test_build_email_html_recovered_without_down_since(make_event):
    body = html_body(build_email(make_event(kind="RECOVERED", message=None), "a@x.com", ["a@x.com"]))
    assert "복구됨" in body
