(function(){
  const COOKIE_NAME = 'namha_tech_club_registered';
  const COOKIE_DAYS = 365;
  const ENDPOINT_SHEET = 'https://api.palat.io.vn/fetch/namhaitc/register';
  const ENDPOINT_USER = 'https://namha-tech.io.vn/service/user/register';
  const SERVICE_NAME = 'webclbnht';
  const TIMEOUT_MS = 12000;

  const INTEREST_LABELS = {
    'design-3d': 'Công nghệ thiết kế kỹ thuật và in 3D',
    'electronics': 'Công nghệ điện tử và mạch điều khiển',
    'embedded': 'Lập trình vi điều khiển và tự động hóa'
  };

  function setCookie(name, value, days){
    const d = new Date();
    d.setTime(d.getTime() + days*24*60*60*1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  }

  function getCookie(name){
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? decodeURIComponent(match.pop()) : null;
  }

  const formWrapper = document.getElementById('formWrapper');
  const statePrev = document.getElementById('statePreviouslyRegistered');
  const stateSuccess = document.getElementById('stateSuccess');
  const stateError = document.getElementById('stateError');

  // Nếu đã đăng ký trước đó (cookie), hiện trạng thái chờ ngay khi tải trang
  const existing = getCookie(COOKIE_NAME);
  if (existing) {
    let name = existing;
    try { name = JSON.parse(existing).name || existing; } catch(e) {}
    document.getElementById('prevRegisteredDesc').textContent =
      name + ' đã đăng ký, xin chờ tới ngày tuyên bố thành lập CLB.';
    formWrapper.style.display = 'none';
    statePrev.classList.add('show');
  }

  const form = document.getElementById('registerForm');
  const alumniCheck = document.getElementById('isAlumni');
  const alumniCollapse = document.getElementById('alumniCollapse');
  const classCollapse = document.getElementById('classCollapse');
  classCollapse.classList.add('open');

  alumniCheck.addEventListener('change', function(){
    if (this.checked) {
      alumniCollapse.classList.add('open');
      classCollapse.classList.remove('open');
    } else {
      alumniCollapse.classList.remove('open');
      classCollapse.classList.add('open');
    }
  });

  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitLabel = document.getElementById('submitLabel');
  const retryBtn = document.getElementById('retryBtn');

  function clearFieldErrors(){
    form.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
    document.getElementById('interestError').style.display = 'none';
  }

  function validate(){
    clearFieldErrors();
    let ok = true;

    const requiredFields = [
      { el: document.getElementById('fullName').closest('.field'), value: document.getElementById('fullName').value.trim() },
      { el: document.getElementById('email').closest('.field'), value: document.getElementById('email').value.trim(), isEmail:true },
      { el: document.getElementById('password').closest('.field'), value: document.getElementById('password').value, minLen:6 },
      { el: document.getElementById('reason').closest('.field'), value: document.getElementById('reason').value.trim() },
    ];

    if (alumniCheck.checked) {
      requiredFields.push({ el: document.getElementById('university').closest('.field'), value: document.getElementById('university').value.trim() });
    } else {
      requiredFields.push({ el: document.getElementById('className').closest('.field'), value: document.getElementById('className').value.trim() });
    }

    requiredFields.forEach(f => {
      let invalid = !f.value;
      if (!invalid && f.isEmail) invalid = !/^\S+@\S+\.\S+$/.test(f.value);
      if (!invalid && f.minLen) invalid = f.value.length < f.minLen;
      if (invalid) { f.el.classList.add('invalid'); ok = false; }
    });

    const interest = form.querySelector('input[name="interest"]:checked');
    if (!interest) {
      document.getElementById('interestError').style.display = 'block';
      ok = false;
    }

    return ok;
  }

  function setLoading(loading){
    submitBtn.disabled = loading;
    submitSpinner.style.display = loading ? 'inline-block' : 'none';
    submitLabel.textContent = loading ? 'Đang gửi...' : 'Gửi đăng ký';
    if (loading) submitBtn.style.opacity = '0.85'; else submitBtn.style.opacity = '1';
  }

  function showSuccess(name){
    setCookie(COOKIE_NAME, JSON.stringify({ name: name }), COOKIE_DAYS);
    formWrapper.style.display = 'none';
    stateError.classList.remove('show');
    stateSuccess.classList.add('show');
  }

  const DEFAULT_ERROR_MSG = 'Không thể gửi đăng ký lúc này. Có thể do kết nối mạng hoặc máy chủ phản hồi quá lâu.';
  const stateErrorDesc = document.getElementById('stateErrorDesc');

  function showError(message){
    stateErrorDesc.textContent = message || DEFAULT_ERROR_MSG;
    formWrapper.style.display = 'none';
    stateSuccess.classList.remove('show');
    stateError.classList.add('show');
  }

  function backToForm(){
    stateError.classList.remove('show');
    stateErrorDesc.textContent = DEFAULT_ERROR_MSG;
    formWrapper.style.display = '';
    setLoading(false);
  }

  retryBtn.addEventListener('click', backToForm);

  // Ghi log đăng ký vào Google Sheet — chỉ để lưu trữ, không ảnh hưởng tới kết quả hiển thị cho người dùng
  function logToSheet(payload){
    const sheetBody = {
      name: payload.fullName,
      email: payload.email,
      class_or_school: payload.classOrSchool,
      value: payload.interestLabel,
      interest_code: payload.interest,
      reason: payload.reason,
      is_alumni: payload.isAlumni
    };
    fetch(ENDPOINT_SHEET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetBody)
    }).catch(function(){ /* best-effort, bỏ qua lỗi log */ });
  }

  async function submitRegistration(payload){
    // Gửi log Google Sheet song song, không chờ và không chặn kết quả
    logToSheet(payload);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const userBody = {
      name: payload.fullName,
      data1: payload.classOrSchool,
      data2: payload.reason,
      service: SERVICE_NAME,
      email: payload.email,
      password: payload.password
    };

    try {
      const res = await fetch(ENDPOINT_USER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userBody),
        signal: controller.signal
      });
      clearTimeout(timer);

      let data = null;
      try { data = await res.json(); } catch(e) {}
      const msg = (data && data.message) ? String(data.message).trim() : '';

      if (res.status === 200 && /^OK$/i.test(msg)) {
        showSuccess(payload.fullName);
      } else if (/email đã tồn tại/i.test(msg)) {
        showError('Email này đã được đăng ký trước đó. Vui lòng dùng email khác rồi thử lại.');
      } else if (/thiếu dữ liệu/i.test(msg)) {
        showError('Thiếu dữ liệu bắt buộc. Vui lòng kiểm tra lại các trường đã điền.');
      } else {
        showError();
      }
    } catch (err) {
      clearTimeout(timer);
      showError();
    }
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!validate()) return;

    const isAlumni = alumniCheck.checked;
    const classOrSchool = isAlumni
      ? document.getElementById('university').value.trim()
      : document.getElementById('className').value.trim();
    const interest = form.querySelector('input[name="interest"]:checked').value;

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      isAlumni: isAlumni,
      classOrSchool: classOrSchool,
      interest: interest,
      interestLabel: INTEREST_LABELS[interest] || interest,
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      reason: document.getElementById('reason').value.trim()
    };

    setLoading(true);
    submitRegistration(payload);
  });
})();