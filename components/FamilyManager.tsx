
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, UserPlus, MoreVertical, Crown, Baby, Heart, Trash2, Edit2, X, Share2, MessageCircle, Plus, Loader2, ChevronRight, ShieldCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { UserProfile, BabyProfile } from '../types';
import BabyProfileEditor from './BabyProfileEditor';
import { useModal } from './GlobalModal';
import { supabase, uploadImage, dataURLtoFile } from '../lib/supabase';

interface FamilyMember {
  id: string;
  name: string;
  role: 'admin' | 'partner' | 'baby' | 'member';
  roleName: string;
  avatar: string;
  isMe?: boolean;
}

interface GroupData {
    id: string;
    inviteCode: string;
    members: FamilyMember[];
    babyProfiles: BabyProfile[];
    myRole: 'admin' | 'member';
    createdBy: string;
}

interface FamilyManagerProps {
  user: UserProfile;
  babyProfiles: BabyProfile[];
  enableBabyMode: boolean;
  onUpdateBabyProfiles: (profiles: BabyProfile[]) => void;
  onToggleBabyMode: () => void;
  onBack: () => void;
  onClose: () => void;
}

const FamilyManager: React.FC<FamilyManagerProps> = ({ 
    user, 
    babyProfiles: globalBabyProfiles, 
    enableBabyMode, 
    onUpdateBabyProfiles, 
    onToggleBabyMode,
    onBack, 
    onClose 
}) => {
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [isBabyFoodEditorOpen, setIsBabyEditorOpen] = useState(false);
  const [editingBabyIndex, setEditingBabyIndex] = useState<{groupIndex: number, babyIndex: number} | null>(null);
  const [showBabyActionSheet, setShowBabyActionSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<'none' | 'recursion' | 'unknown'>('none');
  
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [myInviteCode, setMyInviteCode] = useState<string>('');
  const [myPrimaryGroupId, setMyPrimaryGroupId] = useState<string>('');

  const [selectedMember, setSelectedMember] = useState<{member: FamilyMember, groupId: string} | null>(null);
  const [showInviteSheet, setShowInviteSheet] = useState<string | null>(null); 
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  const calculateMonths = (dateString: string) => {
    if (!dateString) return 0;
    const birth = new Date(dateString);
    const now = new Date();
    let diff = (now.getFullYear() - birth.getFullYear()) * 12;
    diff -= birth.getMonth();
    diff += now.getMonth();
    return diff <= 0 ? 0 : diff;
  };

  useEffect(() => {
      if (user && user.id && user.id !== 'demo-user-id') {
          fetchFamilyData();
      } else if (user.id === 'demo-user-id') {
          setLoading(false);
      }
  }, [user.id]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('invite');
    if (codeFromUrl) {
        handleInviteCodeAutoFill(codeFromUrl);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const handleInviteCodeAutoFill = (code: string) => {
      setJoinCodeInput(code.toUpperCase());
      setShowJoinPrompt(true);
  };

  const fetchFamilyData = async () => {
      if (!user.id) return;
      setLoading(true);
      setErrorStatus('none');
      try {
          const { data: myMemberships, error: memError } = await supabase
              .from('family_members')
              .select('group_id, role')
              .eq('user_id', user.id);

          if (memError) {
              if (memError.message.includes('recursion') || memError.code === '42P17') {
                  console.error("CRITICAL: DB RLS Recursion Error detected in family_members");
                  setErrorStatus('recursion');
              }
              throw memError;
          }

          if (myMemberships && myMemberships.length > 0) {
              const groupIds = myMemberships.map(m => m.group_id);
              const { data: groupsInfo, error: grpError } = await supabase
                  .from('family_groups')
                  .select('*')
                  .in('id', groupIds);

              if (grpError) throw grpError;

              const { data: allMembersData, error: allMbrError } = await supabase
                  .from('family_members')
                  .select(`
                      user_id,
                      role,
                      group_id,
                      nickname,
                      profiles!user_id (name, avatar_url)
                  `)
                  .in('group_id', groupIds)
                  .order('joined_at', { ascending: true });

              if (allMbrError) throw allMbrError;

              if (groupsInfo) {
                  const currentUserIdNormalized = String(user.id).toLowerCase().trim();
                  let foundMyGroup = false;
                  groupsInfo.forEach(g => {
                      const dbCreatorId = String(g.created_by || '').toLowerCase().trim();
                      if (dbCreatorId === currentUserIdNormalized) {
                          setMyInviteCode(g.invite_code);
                          setMyPrimaryGroupId(g.id);
                          foundMyGroup = true;
                      }
                  });

                  if (!foundMyGroup) {
                      setMyInviteCode('');
                      setMyPrimaryGroupId('');
                  }

                  const processedGroups: GroupData[] = groupsInfo.map(g => {
                      const dbCreatorId = String(g.created_by || '').toLowerCase().trim();
                      const groupMembers = (allMembersData || [])
                          .filter(m => m.group_id === g.id)
                          .map((m: any) => {
                              const memberUserId = String(m.user_id).toLowerCase().trim();
                              const isMe = memberUserId === currentUserIdNormalized;
                              const roleLabel = getRoleDisplayName(m.role);
                              return {
                                  id: m.user_id,
                                  name: m.nickname || m.profiles?.name || 'Unknown',
                                  role: m.role as any,
                                  roleName: isMe ? `나 ${roleLabel}` : roleLabel,
                                  avatar: m.profiles?.avatar_url || 'https://picsum.photos/200/200',
                                  isMe: isMe
                              };
                          });
                      
                      const myMembership = myMemberships.find(m => m.group_id === g.id);
                      const isCreatorMatch = dbCreatorId === currentUserIdNormalized;
                      const myRoleInGroup = (isCreatorMatch || myMembership?.role === 'admin') ? 'admin' : 'member';

                      return {
                          id: g.id,
                          inviteCode: g.invite_code, 
                          members: groupMembers,
                          babyProfiles: g.baby_profile ? (Array.isArray(g.baby_profile) ? g.baby_profile : [g.baby_profile]) : [],
                          myRole: myRoleInGroup as 'admin' | 'member',
                          createdBy: dbCreatorId
                      };
                  });

                  processedGroups.sort((a, b) => {
                      const aIsCreator = a.createdBy === currentUserIdNormalized;
                      const bIsCreator = b.createdBy === currentUserIdNormalized;
                      if (aIsCreator && !bIsCreator) return -1;
                      if (!aIsCreator && bIsCreator) return 1;
                      return 0;
                  });

                  setGroups(processedGroups);
                  const allBabies = processedGroups.flatMap(g => g.babyProfiles);
                  const uniqueBabies = Array.from(new Map(allBabies.map(p => [p.id || p.name, p])).values());
                  onUpdateBabyProfiles(uniqueBabies);
              }
          } else {
              setGroups([]);
              setMyInviteCode('');
              setMyPrimaryGroupId('');
              onUpdateBabyProfiles([]);
          }
      } catch (error: any) {
          console.error("Family Data Fetch Failed:", error);
          if (error.message?.includes('recursion')) setErrorStatus('recursion');
          else setErrorStatus('unknown');
      } finally {
          setLoading(false);
      }
  };

  const createGroup = async () => {
      if (myInviteCode) {
          showAlert('이미 직접 생성한 그룹이 있습니다.\n기존 그룹의 초대 코드를 공유해주세요.');
          return;
      }
      setLoading(true);
      try {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = 'HK-';
          for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          const { data: group, error: groupError } = await supabase
              .from('family_groups')
              .insert([{ invite_code: code, created_by: user.id }])
              .select()
              .single();

          if (groupError) throw groupError;

          const { error: memberError } = await supabase
              .from('family_members')
              .insert([{ 
                  group_id: group.id, 
                  user_id: user.id, 
                  role: 'admin',
                  nickname: user.name 
              }]);

          if (memberError) throw memberError;

          await fetchFamilyData();
          showAlert('새로운 그룹이 생성되었습니다!\n내 초대 코드를 친구에게 공유해보세요.');
      } catch (error: any) {
          showAlert('그룹 생성 중 오류가 발생했습니다.');
      } finally {
          setLoading(false);
      }
  };

  const joinGroup = async () => {
      const targetCode = joinCodeInput.trim().toUpperCase();
      if (!targetCode) return;
      
      setLoading(true);
      try {
          const { data: group, error: fetchError } = await supabase
              .from('family_groups')
              .select('id')
              .eq('invite_code', targetCode)
              .maybeSingle();

          if (fetchError) throw fetchError;

          if (!group) {
              throw new Error('유효하지 않거나 만료된 초대 코드입니다.');
          }

          const { error: joinError } = await supabase
              .from('family_members')
              .insert([{ 
                  group_id: group.id, 
                  user_id: user.id, 
                  role: 'member', 
                  nickname: user.name 
              }]);
          
          if (joinError) {
              if (joinError.code === '23505') throw new Error('이미 참여 중인 그룹입니다.');
              throw joinError;
          }

          await fetchFamilyData();
          setShowJoinPrompt(false);
          setJoinCodeInput('');
          showAlert('그룹에 성공적으로 합류했습니다!');
      } catch (error: any) {
          showAlert(error.message || '참여에 실패했습니다.');
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateRole = async (newRole: 'admin' | 'member') => {
      if (!selectedMember) return;
      try {
          const { error } = await supabase
              .from('family_members')
              .update({ role: newRole })
              .eq('group_id', selectedMember.groupId)
              .eq('user_id', selectedMember.member.id);
          if (error) throw error;
          fetchFamilyData();
          showAlert(`권한이 ${newRole === 'admin' ? '관리자' : '멤버'}로 변경되었습니다.`);
      } catch (e) { showAlert('권한 변경에 실패했습니다.'); }
      setSelectedMember(null);
  };

  const handleSaveBabyProfile = async (data: BabyProfile) => {
    if (!editingBabyIndex) return;
    
    setLoading(true);
    let avatarUrl = data.avatar;
    if (avatarUrl && avatarUrl.startsWith('data:')) {
        try {
            const file = dataURLtoFile(avatarUrl, `baby_avatar_${Date.now()}.jpg`);
            const uploadedUrl = await uploadImage(file, 'meal_images'); 
            if (uploadedUrl) avatarUrl = uploadedUrl;
        } catch (e) { console.error("Avatar upload failed:", e); }
    }
    
    const newProfile = { ...data, id: data.id || crypto.randomUUID(), avatar: avatarUrl };
    const targetGroup = groups[editingBabyIndex.groupIndex];
    let updatedProfiles = [...targetGroup.babyProfiles];
    
    if (editingBabyIndex.babyIndex !== -1) {
        updatedProfiles[editingBabyIndex.babyIndex] = newProfile;
    } else {
        updatedProfiles.push(newProfile);
    }

    try {
        const { error } = await supabase
            .from('family_groups')
            .update({ baby_profile: updatedProfiles })
            .eq('id', targetGroup.id);
        
        if (error) throw error;
        await fetchFamilyData(); 
        if (!enableBabyMode) onToggleBabyMode();
        
        showAlert('아기 프로필이 저장되었습니다.');
        setIsBabyEditorOpen(false);
        setEditingBabyIndex(null);
    } catch (error: any) {
        showAlert('프로필 저장에 실패했습니다.');
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteBaby = async () => {
    if (!editingBabyIndex) return;
    const targetGroup = groups[editingBabyIndex.groupIndex];
    const babyName = targetGroup.babyProfiles[editingBabyIndex.babyIndex].name;
    
    if (await showConfirm(`${babyName}의 프로필을 정말 삭제하시겠습니까?`)) {
        setLoading(true);
        const updatedProfiles = targetGroup.babyProfiles.filter((_, idx) => idx !== editingBabyIndex.babyIndex);
        try {
            const { error } = await supabase
                .from('family_groups')
                .update({ baby_profile: updatedProfiles })
                .eq('id', targetGroup.id);
            if (error) throw error;
            await fetchFamilyData();
            showAlert('프로필이 삭제되었습니다.');
        } catch (error) { 
            showAlert('삭제에 실패했습니다.'); 
        } finally {
            setLoading(false);
        }
    }
    setShowBabyActionSheet(false);
    setEditingBabyIndex(null);
  };

  const handleAddBaby = (groupIndex: number) => {
    setEditingBabyIndex({ groupIndex, babyIndex: -1 });
    setIsBabyEditorOpen(true);
  };

  const handleEditBabyClick = (groupIndex: number, babyIndex: number) => {
    setEditingBabyIndex({ groupIndex, babyIndex });
    setShowBabyActionSheet(true);
  };

  const startEditingBaby = () => {
    setShowBabyActionSheet(false);
    setIsBabyEditorOpen(true);
  };

  const handleCopyCodeOnly = (code: string | undefined) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showAlert('초대 코드가 복사되었습니다!');
  };

  const handleCopyFullLink = (code: string | undefined) => {
    if (!code) return;
    const fullLink = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    navigator.clipboard.writeText(fullLink);
    showAlert('초대 링크가 복사되었습니다!\n친구에게 전달하여 함께 식단을 관리해보세요.');
  };

  const getRoleDisplayName = (role: string) => {
      switch(role) {
          case 'admin': return '(관리자)';
          case 'partner': return '(파트너)';
          case 'member': return '(멤버)';
          case 'baby': return '(아기)';
          default: return '(멤버)';
      }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={14} className="text-yellow-500" />;
      case 'partner': return <Heart size={14} className="text-red-500" />;
      case 'baby': return <Baby size={14} className="text-indigo-500" />;
      default: return null;
    }
  };

  const handleEditName = async () => {
     if (!selectedMember) return;
     const newName = await showPrompt('이름을 수정하시겠습니까?', { defaultValue: selectedMember.member.name, confirmText: '수정' });
     if (newName === null || !newName.trim()) return;
     try {
         await supabase.from('family_members').update({ nickname: newName.trim() }).eq('group_id', selectedMember.groupId).eq('user_id', selectedMember.member.id);
         fetchFamilyData();
     } catch (e) { showAlert('수정 실패'); }
     setSelectedMember(null);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    if (await showConfirm('정말 이 구성원을 내보내시겠습니까?')) {
        try {
            await supabase.from('family_members').delete().eq('group_id', selectedMember.groupId).eq('user_id', selectedMember.member.id);
            fetchFamilyData();
        } catch (e) { showAlert('삭제 오류'); }
    }
    setSelectedMember(null);
  };

  const currentSelectedBaby = editingBabyIndex && editingBabyIndex.babyIndex !== -1 
    ? groups[editingBabyIndex.groupIndex].babyProfiles[editingBabyIndex.babyIndex] 
    : null;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
      <div className="sticky top-0 bg-white z-10 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-800">친구 관리</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 space-y-10 pb-24">
        {loading ? (
            <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-brand-500" size={32} />
                    <p className="text-gray-400 text-sm font-medium">정보를 불러오는 중...</p>
                </div>
            </div>
        ) : errorStatus === 'recursion' ? (
            <div className="text-center py-10 space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500"><AlertTriangle size={40} /></div>
                <div className="px-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">DB 설정 오류 감지</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">데이터베이스 RLS 정책에서 무한 재귀 에러가 발생했습니다.<br/><strong>DB_GUIDE.md</strong> 파일의 최신 SQL을 실행하여 설정을 업데이트해주세요.</p>
                </div>
                <button onClick={fetchFamilyData} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold transition-transform active:scale-95">다시 시도</button>
            </div>
        ) : (
            <>
                {/* 내 초대 코드 섹션: 본인이 생성한 그룹이 있을 때만 노출 */}
                {myInviteCode && (
                    <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100 text-center animate-[fadeIn_0.3s_ease-out]">
                        <h2 className="text-brand-900 font-bold text-lg mb-2">내 초대 코드</h2>
                        <div 
                            className="bg-white border-2 border-dashed border-brand-200 rounded-xl p-3 flex items-center justify-between gap-3 mb-3"
                        >
                            <span className="text-[18px] font-mono font-bold text-gray-700 tracking-widest pl-2">
                                {myInviteCode}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleCopyCodeOnly(myInviteCode); }} className="bg-brand-500 text-white p-2 rounded-lg hover:bg-brand-600 transition-colors">
                                <Copy size={18} />
                            </button>
                        </div>
                        <button onClick={() => handleCopyFullLink(myInviteCode)} className="text-xs text-brand-600 font-medium underline">초대 링크 공유하기</button>
                    </div>
                )}

                <div className="space-y-12">
                    {groups.map((group, gIdx) => (
                        <div key={group.id} className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-700 text-[15px]">참여 친구 <span className="text-brand-500">{group.members.length}</span></h3>
                                        <span onClick={() => handleCopyCodeOnly(group.inviteCode)} className="text-[11px] text-brand-500 font-mono font-bold bg-brand-50 px-2 py-0.5 rounded border border-brand-100 cursor-pointer">Code: {group.inviteCode}</span>
                                    </div>
                                    <button onClick={() => setShowInviteSheet(group.id)} className="flex items-center gap-1 text-[11px] text-brand-600 font-bold bg-brand-50 px-2.5 py-1 rounded-full hover:bg-brand-100 transition-colors shadow-sm active:scale-95"><UserPlus size={14} /><span>초대</span></button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {group.members.map(member => (
                                        <div key={`${group.id}-${member.id}`} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                                                    {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-2xl">👤</div>}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-gray-100">{getRoleIcon(member.role)}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-gray-800">{member.name}</h4>
                                                    {member.isMe && <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded">나</span>}
                                                </div>
                                                <p className="text-xs text-gray-500">{member.roleName}</p>
                                            </div>
                                            <button onClick={() => setSelectedMember({ member, groupId: group.id })} className="text-gray-300 p-2 hover:bg-gray-50 rounded-full transition-colors"><MoreVertical size={20} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {enableBabyMode ? (
                                <div className="pt-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-700 text-[15px]">아기 프로필</h3>
                                        <button onClick={() => handleAddBaby(gIdx)} className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"><Plus size={14} /><span>등록</span></button>
                                    </div>
                                    <div className="space-y-3">
                                        {group.babyProfiles.map((baby, bIdx) => (
                                            <div key={`${group.id}-baby-${bIdx}`} onClick={() => handleEditBabyClick(gIdx, bIdx)} className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm overflow-hidden">
                                                        {baby.avatar ? <img src={baby.avatar} className="w-full h-full object-cover" /> : "👶"}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-indigo-900">{baby.name}</h4>
                                                        <p className="text-xs text-indigo-600">{calculateMonths(baby.birthDate)}개월 • 알레르기 {baby.allergies.length}개</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-indigo-400" />
                                            </div>
                                        ))}
                                        {group.babyProfiles.length === 0 && (
                                            <button onClick={() => handleAddBaby(gIdx)} className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-indigo-200 transition-colors"><Plus size={18} />아기 프로필 등록하기</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-2 flex justify-center">
                                    <button onClick={() => handleAddBaby(gIdx)} className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 text-[13px] font-medium py-2 px-4 rounded-full transition-colors"><Baby size={16} />아기 식단 관리 시작하기</button>
                                </div>
                            )}
                            {gIdx < groups.length - 1 && <hr className="border-gray-50 mt-10" />}
                        </div>
                    ))}
                </div>
                
                <div className="pt-4 pb-8 space-y-3">
                    <button onClick={() => setShowJoinPrompt(true)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-brand-100 text-brand-600 font-bold hover:bg-brand-50 transition-colors shadow-sm">
                        <Plus size={20} /> 다른 친구 그룹 합류하기
                    </button>
                    {!myInviteCode && (
                        <div className="space-y-2">
                            <button onClick={createGroup} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200">
                                <Plus size={20} /> 새 그룹 만들기
                            </button>
                            <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                                <Info size={12} className="text-gray-300" /> 새 그룹 만들기 버튼을 클릭해야 초대코드가 생성됩니다.
                            </p>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>

      {isBabyFoodEditorOpen && (
        <BabyProfileEditor initialData={currentSelectedBaby || { name: '', birthDate: '', allergies: [] }} onSave={handleSaveBabyProfile} onClose={() => { setIsBabyEditorOpen(false); setEditingBabyIndex(null); }} />
      )}
      
      {showJoinPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[28px] w-full max-sm shadow-2xl p-6 animate-[scaleIn_0.2s_ease-out]">
             <h3 className="text-lg font-bold text-gray-800 mb-2">초대 코드 입력</h3>
             <p className="text-gray-600 mb-6 text-sm">공유받은 8자리 코드를 입력해주세요.</p>
             <input type="text" value={joinCodeInput} onChange={(e) => setJoinCodeInput(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-bold mb-6 focus:border-brand-500 focus:outline-none uppercase" placeholder="HK-000000" autoFocus />
             <div className="flex gap-3">
                 <button onClick={() => setShowJoinPrompt(false)} className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">취소</button>
                 <button onClick={joinGroup} disabled={!joinCodeInput.trim()} className="flex-1 py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm disabled:opacity-50">참여하기</button>
             </div>
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setSelectedMember(null)}>
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-gray-800">{selectedMember.member.name} 관리</h3>
                    <button onClick={() => setSelectedMember(null)} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                    <button onClick={handleEditName} className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm"><Edit2 size={20} /></div>
                        <div className="text-left"><p className="font-bold text-gray-800">이름 수정</p><p className="text-xs text-gray-500">그룹 내 표시되는 이름을 변경합니다</p></div>
                    </button>
                    {selectedMember.member.isMe && (
                        <button onClick={() => { setSelectedMember(null); setShowJoinPrompt(true); }} className="w-full flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm"><UserPlus size={20} /></div>
                            <div className="text-left"><p className="font-bold text-gray-800">새로운 그룹 참여 (추가)</p><p className="text-xs text-gray-500">초대 코드를 입력하여 다른 그룹에 추가로 합류합니다</p></div>
                        </button>
                    )}
                    {!selectedMember.member.isMe && groups.find(g => g.id === selectedMember.groupId)?.myRole === 'admin' && (
                        <>
                            {selectedMember.member.role !== 'admin' ? (
                                <button onClick={() => handleUpdateRole('admin')} className="w-full flex items-center gap-3 p-4 bg-yellow-50 rounded-2xl hover:bg-yellow-100 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-yellow-500 shadow-sm"><ShieldCheck size={20} /></div>
                                    <div className="text-left"><p className="font-bold text-yellow-700">관리자 권한 부여</p><p className="text-xs text-yellow-600">이 멤버에게 관리 권한을 부여합니다</p></div>
                                </button>
                            ) : (
                                <button onClick={() => handleUpdateRole('member')} className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm"><ShieldAlert size={20} /></div>
                                    <div className="text-left"><p className="font-bold text-blue-700">관리자 권한 해제</p><p className="text-xs text-blue-600">이 멤버의 관리 권한을 회수합니다</p></div>
                                </button>
                            )}
                            <button onClick={handleRemoveMember} className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm"><Trash2 size={20} /></div>
                                <div className="text-left"><p className="font-bold text-red-600">내보내기</p><p className="text-xs text-red-400">친구 그룹에서 제외합니다</p></div>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      {showBabyActionSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => { setShowBabyActionSheet(false); setEditingBabyIndex(null); }}>
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-xl text-gray-800">{currentSelectedBaby?.name} 관리</h3>
                    <button onClick={() => { setShowBabyActionSheet(false); setEditingBabyIndex(null); }} className="p-1 bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                    <button onClick={startEditingBaby} className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm"><Edit2 size={20} /></div>
                        <div className="text-left"><p className="font-bold text-gray-800">정보 수정</p><p className="text-xs text-gray-500">아기 프로필 정보를 변경합니다</p></div>
                    </button>
                    <button onClick={handleDeleteBaby} className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm"><Trash2 size={20} /></div>
                        <div className="text-left"><p className="font-bold text-red-600">프로필 삭제</p><p className="text-xs text-red-400">그룹에서 아기 프로필을 완전히 삭제합니다</p></div>
                    </button>
                </div>
            </div>
        </div>
      )}

      {showInviteSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowInviteSheet(null)}>
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-[slideUp_0.3s_ease-out]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2 px-2">
                    <div className="text-left">
                        <h3 className="font-bold text-xl text-gray-800 leading-tight">친구 초대하기</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">초대 코드: <span className="font-mono font-black text-brand-600 ml-1">{groups.find(g => g.id === showInviteSheet)?.inviteCode || myInviteCode}</span></p>
                    </div>
                    <button onClick={() => setShowInviteSheet(null)} className="p-2 bg-gray-100 rounded-full text-gray-500 transition-colors active:scale-95"><X size={20} /></button>
                </div>
                <div className="space-y-3">
                    <button onClick={() => { 
                        const group = groups.find(g => g.id === showInviteSheet) || { inviteCode: myInviteCode };
                        const code = group?.inviteCode;
                        const shareUrl = `${window.location.origin}${window.location.pathname}?invite=${code}`;
                        const message = `[한끼] 식단 관리에 초대받았습니다!\n아래 링크를 클릭하여 바로 합류하세요:\n${shareUrl}`;
                        navigator.clipboard.writeText(message);
                        showAlert('카카오톡 초대 메시지가 복사되었습니다.\n채팅방에 붙여넣어 주세요!'); 
                        setShowInviteSheet(null); 
                    }} className="w-full flex items-center gap-3 p-4 bg-[#FEE500] rounded-2xl hover:bg-[#FDD835] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#3C1E1E] shadow-sm"><MessageCircle size={20} fill="currentColor" /></div>
                        <div className="text-left"><p className="font-bold text-[#3C1E1E]">카카오톡으로 초대</p><p className="text-xs text-[#3C1E1E]/70">링크가 포함된 초대장 보내기</p></div>
                    </button>
                    <button onClick={() => { 
                        const group = groups.find(g => g.id === showInviteSheet) || { inviteCode: myInviteCode };
                        const code = group?.inviteCode;
                        const shareUrl = `${window.location.origin}${window.location.pathname}?invite=${code}`;
                        navigator.clipboard.writeText(shareUrl); 
                        showAlert('초대 링크가 복사되었습니다.'); 
                        setShowInviteSheet(null); 
                    }} className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm"><Share2 size={20} /></div>
                        <div className="text-left"><p className="font-bold text-gray-800">초대 링크 복사</p><p className="text-xs text-gray-500">클릭 시 자동 합류되는 링크</p></div>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default FamilyManager;
