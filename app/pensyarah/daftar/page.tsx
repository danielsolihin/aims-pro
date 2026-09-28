try {
      // 1. Daftar ke Supabase Auth (Tukar role kepada 'lecturer')
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'lecturer' // <-- DITUKAR KE 'lecturer'
          }
        }
      });

      if (authError) throw authError;

      // 2. Simpan profil ke 'profiles' (Tukar role kepada 'lecturer')
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              full_name: fullName,
              role: 'lecturer' // <-- DITUKAR KE 'lecturer'
            }
          ]);

        if (profileError) {
          console.error('Ralat simpan profil:', profileError.message);
          throw new Error('Akaun dicipta tetapi gagal menyimpan profil: ' + profileError.message);
        }
      }