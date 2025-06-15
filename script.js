const backendURL = "https://ad2cc5b6-aaa5-4113-a048-07589b3b2d41-00-2xs93kcxr2v2s.spock.replit.dev";

document.getElementById("createWallet").addEventListener("click", async () => {
  const response = await fetch(`${backendURL}/api/wallet/create-wallet`, { method: "POST" });
  const data = await response.json();
  displayOutput(data);
});

document.getElementById("importForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const privateKey = document.getElementById("privateKey").value;
  const response = await fetch(`${backendURL}/api/wallet/import-wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privateKey }),
  });
  const data = await response.json();
  displayOutput(data);
});

function displayOutput(data) {
  const output = document.getElementById("output");
  output.innerHTML = JSON.stringify(data, null, 2);
}

document.getElementById("sendTokensForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const privateKey = document.getElementById("sendPrivateKey").value;
  const tokenAddress = document.getElementById("tokenAddress").value;
  const recipient = document.getElementById("recipient").value;
  const amount = document.getElementById("amount").value;

  const response = await fetch(`${backendURL}/api/wallet/send-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privateKey, tokenAddress, recipient, amount }),
  });

  const data = await response.json();
  displayOutput(data);
});


// التعامل مع عرض الرصيد في الواجهة الأمامية
document.getElementById("getBalanceForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const walletAddress = document.getElementById("balanceWalletAddress").value;
  const tokenAddress = document.getElementById("balanceTokenAddress").value;

  const response = await fetch(`${backendURL}/api/wallet/get-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenAddress, walletAddress }),
  });

  const data = await response.json();
  displayBalance(data);
});

function displayBalance(data) {
  const balanceOutput = document.getElementById("output");
  if (data.balance) {
    balanceOutput.innerHTML = `Balance: ${data.balance}`;
  } else {
    balanceOutput.innerHTML = `Error: ${data.message}`;
  }
}

