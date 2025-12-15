from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Set, Tuple

Criticality = Literal["faible", "moyen", "fort"]
Usage = Literal["interne", "web"]


@dataclass(frozen=True)
class CISRec:
    cis_id: str
    title: str
    level: Literal["L1", "L2"]
    domain: Literal["sysctl", "firewall", "ssh", "sudo", "pam"]
    cost: int  # effort relatif (pour optimisation)
    tags: Set[str] = field(default_factory=set)

@dataclass
class ConfigTemplate:
    sysctl: Dict[str, int]
    firewall_tool: Optional[str]  # "ufw" | "nftables" | "iptables"
    firewall_default_deny: bool
    firewall_allow_ports: List[int]
    sshd: Dict[str, str]
    sudo: Dict[str, str]
    pam: Dict[str, str]


def build_recommendations() -> Dict[str, CISRec]:
    """
    Sous-ensemble CSP-friendly tiré des sections :
    - 3.3.x sysctl network
    - 4.x firewall
    - 5.1.x SSH
    - 5.2.x sudo
    - 5.3.x PAM/password policy

    NB: On ne cherche pas l’exhaustivité. On cherche une base cohérente pour la démo CSP.
    """
    recs: List[CISRec] = [
        # --- SYSCTL (3.3.x) ---
        CISRec("3.3.1", "IP forwarding disabled", "L1", "sysctl", 1, {"net"}),
        CISRec("3.3.2", "Packet redirect sending disabled", "L1", "sysctl", 1, {"net"}),
        CISRec("3.3.5", "ICMP redirects not accepted", "L1", "sysctl", 1, {"net"}),
        CISRec("3.3.7", "Reverse Path Filtering enabled", "L1", "sysctl", 1, {"net"}),
        CISRec("3.3.9", "Suspicious packets logged", "L1", "sysctl", 1, {"net", "logging"}),
        CISRec("3.3.10", "TCP SYN cookies enabled", "L1", "sysctl", 1, {"net"}),
        CISRec("3.3.11", "IPv6 router advertisements not accepted", "L1", "sysctl", 1, {"ipv6"}),

        # --- FIREWALL core ---
        CISRec("4.1.1", "Ensure only one firewall utility is in use", "L1", "firewall", 2, {"fw"}),
        # UFW path (4.2.x)
        CISRec("4.2.1", "UFW installed", "L1", "firewall", 2, {"fw", "ufw"}),
        CISRec("4.2.7", "UFW default deny policy", "L1", "firewall", 2, {"fw", "ufw"}),
        CISRec("4.2.6", "UFW rules exist for all open ports", "L1", "firewall", 2, {"fw", "ufw"}),
        # NFTables path (4.3.x)
        CISRec("4.3.1", "nftables installed", "L1", "firewall", 2, {"fw", "nftables"}),
        CISRec("4.3.8", "nftables default deny policy", "L1", "firewall", 2, {"fw", "nftables"}),
        CISRec("4.3.10", "nftables rules exist for all open ports", "L1", "firewall", 2, {"fw", "nftables"}),

        # --- SSH (5.1.x) ---
        CISRec("5.1.1", "sshd_config permissions configured", "L1", "ssh", 1, {"ssh"}),
        CISRec("5.1.2", "SSH private host key permissions configured", "L1", "ssh", 1, {"ssh"}),
        CISRec("5.1.6", "SSH ciphers configured", "L1", "ssh", 2, {"ssh", "crypto"}),
        CISRec("5.1.7", "SSH idle timeout configured", "L1", "ssh", 1, {"ssh"}),
        CISRec("5.1.13", "SSH login grace time configured", "L1", "ssh", 1, {"ssh"}),
        CISRec("5.1.16", "SSH MaxAuthTries configured", "L1", "ssh", 1, {"ssh"}),
        CISRec("5.1.19", "SSH root login disabled", "L1", "ssh", 2, {"ssh"}),
        CISRec("5.1.20", "SSH PermitEmptyPasswords disabled", "L1", "ssh", 1, {"ssh"}),
        # Level 2-ish tightening example
        CISRec("5.1.9", "SSH GSSAPIAuthentication disabled", "L2", "ssh", 1, {"ssh"}),

        # --- SUDO (5.2.x) ---
        CISRec("5.2.1", "sudo installed", "L1", "sudo", 1, {"sudo"}),
        CISRec("5.2.2", "sudo uses pty", "L1", "sudo", 1, {"sudo", "logging"}),
        CISRec("5.2.3", "sudo log file configured", "L1", "sudo", 1, {"sudo", "logging"}),

        # --- PAM (5.3.x) : subset ---
        CISRec("5.3.2.1", "pam modules configured (baseline)", "L1", "pam", 2, {"pam"}),
        CISRec("5.3.3.1.1", "password complexity configured (pwquality)", "L1", "pam", 2, {"pam", "password"}),
        CISRec("5.3.3.1.2", "password length configured (minlen)", "L1", "pam", 2, {"pam", "password"}),
        CISRec("5.3.3.2.1", "account lockout configured (faillock)", "L1", "pam", 2, {"pam", "auth"}),
        # L2-ish stronger
        CISRec("5.3.3.1.3", "password reuse limited (pwhistory)", "L2", "pam", 2, {"pam", "password"}),
    ]

    return {r.cis_id: r for r in recs}


def default_config_template() -> ConfigTemplate:
    """Valeurs 'baseline' (seront surchargées si des recommandations sont sélectionnées)."""
    return ConfigTemplate(
        sysctl={},
        firewall_tool=None,
        firewall_default_deny=False,
        firewall_allow_ports=[],
        sshd={},
        sudo={},
        pam={},
    )


def apply_rec_to_config(cfg: ConfigTemplate, rec_id: str, usage: Usage) -> None:
    """
    Mapping rec -> paramètres concrets (simplifié).
    Le but est une sortie YAML crédible pour la démo.
    """
    # SYSCTL
    sysctl_map = {
        "3.3.1": ("net.ipv4.ip_forward", 0),
        "3.3.2": ("net.ipv4.conf.all.send_redirects", 0),
        "3.3.5": ("net.ipv4.conf.all.accept_redirects", 0),
        "3.3.7": ("net.ipv4.conf.all.rp_filter", 1),
        "3.3.9": ("net.ipv4.conf.all.log_martians", 1),
        "3.3.10": ("net.ipv4.tcp_syncookies", 1),
        "3.3.11": ("net.ipv6.conf.all.accept_ra", 0),
    }
    if rec_id in sysctl_map:
        k, v = sysctl_map[rec_id]
        cfg.sysctl[k] = v
        return

    # FIREWALL
    if rec_id.startswith("4.2."):  # UFW path
        cfg.firewall_tool = "ufw"
        if rec_id in {"4.2.7"}:
            cfg.firewall_default_deny = True
        if rec_id in {"4.2.6"}:
            # ports will be set from usage by renderer/solver
            pass
        return
    if rec_id.startswith("4.3."):  # nftables path
        cfg.firewall_tool = "nftables"
        if rec_id in {"4.3.8"}:
            cfg.firewall_default_deny = True
        if rec_id in {"4.3.10"}:
            pass
        return

    # SSH
    if rec_id == "5.1.19":
        cfg.sshd["PermitRootLogin"] = "no"
    elif rec_id == "5.1.20":
        cfg.sshd["PermitEmptyPasswords"] = "no"
    elif rec_id == "5.1.7":
        cfg.sshd["ClientAliveInterval"] = "300"
        cfg.sshd["ClientAliveCountMax"] = "0"
    elif rec_id == "5.1.13":
        cfg.sshd["LoginGraceTime"] = "60"
    elif rec_id == "5.1.16":
        cfg.sshd["MaxAuthTries"] = "3"
    elif rec_id == "5.1.6":
        cfg.sshd["Ciphers"] = "chacha20-poly1305@openssh.com,aes256-gcm@openssh.com"
    elif rec_id == "5.1.9":
        cfg.sshd["GSSAPIAuthentication"] = "no"
    elif rec_id in {"5.1.1", "5.1.2"}:
        # perms checks -> no direct sshd_config line, ignore in config output
        pass

    # SUDO
    if rec_id == "5.2.2":
        cfg.sudo["use_pty"] = "true"
    if rec_id == "5.2.3":
        cfg.sudo["logfile"] = "/var/log/sudo.log"

    # PAM
    if rec_id == "5.3.3.1.1":
        cfg.pam["pwquality_complexity"] = "enabled"
    if rec_id == "5.3.3.1.2":
        cfg.pam["minlen"] = "14"
    if rec_id == "5.3.3.2.1":
        cfg.pam["faillock"] = "enabled"
    if rec_id == "5.3.3.1.3":
        cfg.pam["pwhistory"] = "enabled"
